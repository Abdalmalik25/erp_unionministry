import { readFileSync, writeFileSync } from 'fs';

const base = 'G:\\App25\\unionministry1\\server\\routes\\';

const conversions = [
  // compliance.js
  { file: 'compliance.js', old: "DELETE FROM risk_assessments WHERE id = $1 RETURNING id", table: 'risk_assessments' },
  { file: 'compliance.js', old: "DELETE FROM compliance_matrices WHERE id = $1 RETURNING id", table: 'compliance_matrices' },
  { file: 'compliance.js', old: "DELETE FROM maturity_assessments WHERE id = $1 RETURNING id", table: 'maturity_assessments' },
  // entities.js
  { file: 'entities.js', old: "DELETE FROM commercial_establishments WHERE id = $1 RETURNING id", table: 'commercial_establishments' },
  { file: 'entities.js', old: "DELETE FROM enterprise_occupation_links WHERE id = $1 RETURNING id", table: 'enterprise_occupation_links' },
  { file: 'entities.js', old: "DELETE FROM entity_relationships WHERE id = $1 RETURNING id", table: 'entity_relationships' },
  // workers.js
  { file: 'workers.js', old: "DELETE FROM worker_reduction_requests WHERE id = $1 RETURNING id", table: 'worker_reduction_requests' },
  // legal.js - special handling for dynamic table
  { file: 'legal.js', old: "DELETE FROM labor_disputes WHERE id = $1 RETURNING id", table: 'labor_disputes' },
  { file: 'legal.js', old: "DELETE FROM expatriate_licenses WHERE id = $1 RETURNING id", table: 'expatriate_licenses' },
  { file: 'legal.js', old: "DELETE FROM evaluation_certificates WHERE id = $1 RETURNING id", table: 'evaluation_certificates' },
  // operations.js
  { file: 'operations.js', old: "DELETE FROM services WHERE id = $1 RETURNING id", table: 'services' },
  // occupations.js
  { file: 'occupations.js', old: "DELETE FROM isic4_classifications WHERE id = $1 RETURNING id", table: 'isic4_classifications' },
];

// First, add deleted_at columns to tables that don't have them
const addColumns = [
  'risk_assessments', 'compliance_matrices', 'maturity_assessments',
  'commercial_establishments', 'enterprise_occupation_links', 'entity_relationships',
  'worker_reduction_requests', 'labor_disputes', 'expatriate_licenses',
  'evaluation_certificates', 'services', 'isic4_classifications',
];

console.log('Tables that need deleted_at columns:', addColumns.join(', '));

// Convert DELETE to soft delete
for (const { file, old, table } of conversions) {
  let c = readFileSync(base + file, 'utf8');
  
  const newSql = `UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`;
  
  if (c.includes(old)) {
    c = c.replace(old, newSql);
    writeFileSync(base + file, c);
    console.log(`Converted ${file}: ${table}`);
  } else {
    console.log(`NOT FOUND in ${file}: ${old.substring(0, 50)}...`);
  }
}

// Also convert the dynamic table DELETE in legal.js
let legal = readFileSync(base + 'legal.js', 'utf8');
const dynamicOld = "DELETE FROM ${table} WHERE id = $1 RETURNING id";
const dynamicNew = "UPDATE ${table} SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id";
if (legal.includes(dynamicOld)) {
  legal = legal.replace(dynamicOld, dynamicNew);
  writeFileSync(base + 'legal.js', legal);
  console.log('Converted legal.js: dynamic table');
}

console.log('\nDone! Run the SQL migration to add deleted_at columns.');
