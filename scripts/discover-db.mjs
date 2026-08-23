import pg from 'pg';
import fs from 'fs';
import path from 'path';

const env = fs.readFileSync(path.resolve('.env'), 'utf-8');
const urlMatch = env.match(/^DATABASE_URL=(.+)$/m);
if (!urlMatch) { console.error('No DATABASE_URL in .env'); process.exit(1); }
const DATABASE_URL = urlMatch[1].trim();

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false }, statement_timeout: 60000, query_timeout: 60000 });
await client.connect();

const q = async (sql) => (await client.query(sql)).rows;
const sections = [];
const h = (title) => { sections.push(`\n## ${title}\n`); };
const table = (headers, rows) => {
  if (!rows || rows.length === 0) { sections.push('No data found.\n'); return; }
  let md = `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n`;
  for (const r of rows) {
    md += `| ${headers.map(h => String(r[h] ?? '').replace(/\|/g, '\\|')).join(' | ')} |\n`;
  }
  md += '\n';
  sections.push(md);
};

console.log('Connecting to database...');
const dbInfo = (await q(`SELECT current_database() as db, version() as ver`))[0];
console.log(`Connected to: ${dbInfo.db}`);

sections.push(`# Database Inventory: ${dbInfo.db}`);
sections.push(`\n> Generated: ${new Date().toISOString()}`);
sections.push(`> Engine: ${dbInfo.ver}`);

// 1. Tables with row counts
console.log('1/14 Tables...');
h('1. Tables with Row Counts');
const tables = await q(`
  SELECT t.tablename,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename) as column_count
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename
`);
const tableNames = tables.map(r => r.tablename);
// Get row counts in batch using a single query
let rowCountMap = {};
try {
  const countParts = tableNames.map(tn => `(SELECT '${tn}' as tbl, count(*)::bigint as cnt FROM "${tn}")`).join(' UNION ALL ');
  const countRows = await q(countParts);
  for (const r of countRows) rowCountMap[r.tbl] = Number(r.cnt);
} catch (e) {
  console.log('Batch row count failed, trying individually...', e.message.slice(0, 80));
  for (const tn of tableNames) {
    try {
      const r = await q(`SELECT count(*)::bigint as cnt FROM "${tn}"`);
      rowCountMap[tn] = Number(r[0].cnt);
    } catch { rowCountMap[tn] = '?'; }
  }
}
const tableRows = tables.map(r => ({ tablename: r.tablename, column_count: r.column_count, row_count: rowCountMap[r.tablename] ?? '?' }));
table(['tablename', 'column_count', 'row_count'], tableRows);
sections.push(`> **Total tables: ${tables.length}**\n`);

// 2. All columns
console.log('2/14 Columns...');
h('2. All Columns');
const columns = await q(`
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`);
table(['table_name', 'column_name', 'data_type', 'is_nullable', 'column_default'], columns);
sections.push(`> **Total columns: ${columns.length}**\n`);

// 3. Constraints
console.log('3/14 Constraints...');
h('3. Constraints');
const constraints = await q(`
  SELECT table_name, constraint_name, constraint_type
  FROM information_schema.table_constraints
  WHERE table_schema = 'public'
  ORDER BY table_name, constraint_name
`);
table(['table_name', 'constraint_name', 'constraint_type'], constraints);
sections.push(`> **Total constraints: ${constraints.length}**\n`);

// 4. Foreign Keys
console.log('4/14 Foreign Keys...');
h('4. Foreign Keys');
const fkeys = await q(`
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ORDER BY tc.table_name, tc.constraint_name
`);
table(['table_name', 'column_name', 'foreign_table_name', 'foreign_column_name', 'constraint_name'], fkeys);
sections.push(`> **Total foreign keys: ${fkeys.length}**\n`);

// 5. Indexes
console.log('5/14 Indexes...');
h('5. Indexes');
const indexes = await q(`
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
  ORDER BY tablename, indexname
`);
table(['tablename', 'indexname', 'indexdef'], indexes);
sections.push(`> **Total indexes: ${indexes.length}**\n`);

// 6. Enums
console.log('6/14 Enums...');
h('6. Enums');
const enums = await q(`
  SELECT t.typname AS enum_name, e.enumlabel AS enum_value, e.enumsortorder AS sort_order
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE n.nspname = 'public'
  ORDER BY t.typname, e.enumsortorder
`);
table(['enum_name', 'enum_value', 'sort_order'], enums);
const enumNames = [...new Set(enums.map(r => r.enum_name))];
sections.push(`> **Total enums: ${enumNames.length}, Total values: ${enums.length}**\n`);

// 7. Views & Materialized Views
console.log('7/14 Views...');
h('7. Views & Materialized Views');
const views = await q(`
  SELECT viewname as view_name, 'view' as type FROM pg_views WHERE schemaname = 'public'
  UNION ALL
  SELECT matviewname as view_name, 'materialized' as type FROM pg_matviews WHERE schemaname = 'public'
  ORDER BY type, view_name
`);
table(['view_name', 'type'], views);

// 8. Triggers
console.log('8/14 Triggers...');
h('8. Triggers');
const triggers = await q(`
  SELECT event_object_table AS table_name, trigger_name, event_manipulation AS event, action_timing AS timing
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  ORDER BY event_object_table, trigger_name
`);
table(['table_name', 'trigger_name', 'event', 'timing'], triggers);
sections.push(`> **Total triggers: ${triggers.length}**\n`);

// 9. Functions/Procedures
console.log('9/14 Functions...');
h('9. Functions & Procedures');
const funcs = await q(`
  SELECT routine_name, routine_type, data_type AS return_type, external_language
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  ORDER BY routine_name
`);
table(['routine_name', 'routine_type', 'return_type', 'external_language'], funcs);
sections.push(`> **Total functions/procedures: ${funcs.length}**\n`);

// 10. Key table row counts
console.log('10/14 Key table counts...');
h('10. Key Table Row Counts');
const keyTables = [
  'organizational_entities', 'members', 'professions', 'enterprises_occupation_links',
  'violations', 'inspections', 'compliance_matrices', 'risk_assessments',
  'activities', 'documents', 'licenses', 'elections',
  'board_members', 'worker_profiles', 'service_requests', 'fee_payments',
  'worker_dispatches', 'commercial_establishments', 'legal_references',
  'law_articles', 'ilo_conventions', 'international_standards'
];
const keyCounts = [];
for (const tbl of keyTables) {
  try {
    const r = await q(`SELECT count(*)::int as count FROM "${tbl}"`);
    keyCounts.push({ table_name: tbl, count: r[0].count, status: 'exists' });
  } catch (e) {
    keyCounts.push({ table_name: tbl, count: '-', status: 'missing' });
  }
}
table(['table_name', 'count', 'status'], keyCounts);

// 11. Orphan records
console.log('11/14 Orphan records...');
h('11. Orphan Records');
const orphans = [];
const checkExists = async (tbl) => {
  try { await q(`SELECT 1 FROM "${tbl}" LIMIT 0`); return true; } catch { return false; }
};
const columnExists = async (tbl, col) => {
  try { const r = await q(`SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='${tbl}' AND column_name='${col}' LIMIT 1`); return r.length > 0; } catch { return false; }
};

// Use the FK constraints already discovered in section 4 to check each one
for (const fk of fkeys) {
  try {
    const childExists = await checkExists(fk.table_name);
    const parentExists = await checkExists(fk.foreign_table_name);
    if (childExists && parentExists) {
      const r = await q(`SELECT count(*)::int as count FROM "${fk.table_name}" WHERE "${fk.column_name}" IS NOT NULL AND "${fk.column_name}" NOT IN (SELECT "${fk.foreign_column_name}" FROM "${fk.foreign_table_name}")`);
      if (r[0].count > 0) {
        orphans.push({ check: `${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`, count: r[0].count });
      }
    }
  } catch (e) {
    orphans.push({ check: `FK ${fk.table_name}.${fk.column_name}`, count: 'error' });
  }
}
if (orphans.length === 0) {
  sections.push('No orphaned foreign key records found across all FK constraints.\n');
} else {
  table(['check (FK relationship)', 'orphan_count'], orphans);
}

// 12. Duplicate data
console.log('12/14 Duplicates...');
h('12. Duplicate Data');
sections.push('### Entities with same name_ar\n');
try {
  const hasNameAr = await columnExists('organizational_entities', 'name_ar');
  if (!hasNameAr) {
    sections.push('Column name_ar does not exist in organizational_entities table.\n');
  } else {
    const r = await q(`SELECT name_ar, count(*)::int as count FROM organizational_entities GROUP BY name_ar HAVING count(*) > 1 ORDER BY count DESC LIMIT 20`);
    if (r.length === 0) { sections.push('No duplicates found.\n'); }
    else { table(['name_ar', 'count'], r); sections.push(`> **${r.length} duplicate groups**\n`); }
  }
} catch (e) { sections.push(`Error: ${e.message}\n`); }

sections.push('### Members with same national_id\n');
try {
  const hasNatId = await columnExists('members', 'national_id');
  if (!hasNatId) {
    sections.push('Column national_id does not exist in members table.\n');
  } else {
    const r = await q(`SELECT national_id, count(*)::int as count FROM members WHERE national_id IS NOT NULL AND national_id != '' GROUP BY national_id HAVING count(*) > 1 ORDER BY count DESC LIMIT 20`);
    if (r.length === 0) { sections.push('No duplicates found.\n'); }
    else { table(['national_id', 'count'], r); sections.push(`> **${r.length} duplicate groups**\n`); }
  }
} catch (e) { sections.push(`Error: ${e.message}\n`); }

// 13. Enum usage
console.log('13/14 Enum usage...');
h('13. Enum Usage');
if (enumNames.length > 0) {
  sections.push('The following custom enum types exist in the database:\n');
  for (const en of enumNames) {
    const vals = enums.filter(r => r.enum_name === en).map(r => r.enum_value);
    sections.push(`- **${en}**: ${vals.join(', ')}`);
  }
  sections.push('');
}

// 14. Data completeness
console.log('14/14 Data completeness...');
h('14. Data Completeness (Key Fields)');
const completenessChecks = [
  { table: 'organizational_entities', fields: ['email', 'phone', 'address', 'name_ar', 'name_en', 'commercial_registration_number'] },
  { table: 'members', fields: ['email', 'phone', 'national_id', 'first_name', 'last_name'] },
  { table: 'worker_profiles', fields: ['email', 'phone', 'national_id'] },
];
for (const cc of completenessChecks) {
  if (!(await checkExists(cc.table))) { sections.push(`### ${cc.table}\nTable does not exist.\n`); continue; }
  sections.push(`### ${cc.table}\n`);
  let md = `| field | total_rows | non_null_count | percentage |\n| --- | --- | --- | --- |\n`;
  for (const f of cc.fields) {
    try {
      const r = await q(`SELECT count(*)::int as total, count("${f}")::int as filled FROM "${cc.table}"`);
      const pct = r[0].total > 0 ? ((r[0].filled / r[0].total) * 100).toFixed(1) + '%' : 'N/A';
      md += `| ${f} | ${r[0].total} | ${r[0].filled} | ${pct} |\n`;
    } catch (e) {
      md += `| ${f} | - | - | column may not exist |\n`;
    }
  }
  md += '\n';
  sections.push(md);
}

// Summary
h('Summary');
let summaryMd = `| Metric | Count |\n| --- | --- |\n`;
summaryMd += `| Total tables | ${tables.length} |\n`;
summaryMd += `| Total columns | ${columns.length} |\n`;
summaryMd += `| Total constraints | ${constraints.length} |\n`;
summaryMd += `| Total foreign keys | ${fkeys.length} |\n`;
summaryMd += `| Total indexes | ${indexes.length} |\n`;
summaryMd += `| Total enums | ${enumNames.length} |\n`;
summaryMd += `| Total views | ${views.length} |\n`;
summaryMd += `| Total triggers | ${triggers.length} |\n`;
summaryMd += `| Total functions/procedures | ${funcs.length} |\n`;
summaryMd += '\n';
sections.push(summaryMd);

await client.end();

const outPath = path.resolve('docs', 'DATABASE_INVENTORY.md');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, sections.join('\n'));
console.log(`\nDone! Written to ${outPath}`);
console.log(`Tables: ${tables.length}, Columns: ${columns.length}, FKs: ${fkeys.length}`);
