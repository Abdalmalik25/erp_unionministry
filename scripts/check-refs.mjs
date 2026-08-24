import fs from 'fs';
import path from 'path';

const files = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|css|html)$/.test(f)) files.push(p);
  }
}
walk('src');
walk('server');
if (fs.existsSync('index.html')) files.push('index.html');

// read all file contents
const contents = new Map();
for (const f of files) contents.set(f, fs.readFileSync(f, 'utf8'));

const candidates = process.argv.slice(2);
for (const c of candidates) {
  if (!fs.existsSync(c)) { console.log(c + ' : MISSING'); continue; }
  const base = path.basename(c).replace(/\.(ts|tsx)$/, '');
  let refs = [];
  for (const [f, content] of contents) {
    if (f === c) continue;
    if (new RegExp(base).test(content)) refs.push(f.replace(/\\/g, '/'));
  }
  console.log(c.replace(/\\/g, '/') + ' -> ' + (refs.length ? refs.join(', ') : 'NO REFS AT ALL'));
}
