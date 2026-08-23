import { readFileSync, writeFileSync } from 'fs';

const base = 'G:\\App25\\unionministry1\\server\\routes\\';
const files = ['entities.js', 'workers.js', 'occupations.js', 'compliance.js', 'operations.js', 'legal.js', 'financial.js', 'system.js'];

let totalFixed = 0;

for (const file of files) {
  let c = readFileSync(base + file, 'utf8');
  let count = 0;

  // Pattern: const total = await pool.query(countQuery('table', where, params));
  // Replace with: const { sql: countSql, params: cp } = countQuery('table', where, params);
  //               const total = await pool.query(countSql, cp);

  const regex = /(\s*)(const \w+ = await pool\.query\(countQuery\(([^)]+)\)\);)/g;
  
  c = c.replace(regex, (match, indent, fullLine, args) => {
    count++;
    return `${indent}const { sql: _qs, params: _qp } = countQuery(${args});\n${indent}const total = await pool.query(_qs, _qp);`;
  });

  if (count > 0) {
    writeFileSync(base + file, c);
    console.log(`Fixed ${count} in ${file}`);
    totalFixed += count;
  }
}

console.log(`\nTotal fixed: ${totalFixed}`);
