const fs = require('fs');
// 1) تقرير أخطاء TypeScript إن وُجد الملف
if (fs.existsSync('tsc_full_audit.txt')) {
  const lines = fs.readFileSync('tsc_full_audit.txt', 'utf8').split(/\r?\n/).filter(l => l.trim());
  console.log('TSC errors:', lines.length);
  const byFile = {};
  const byCode = {};
  lines.forEach(l => {
    const m = l.match(/^(.+?)\((\d+),(\d+)\): (error TS\d+): (.*)$/);
    if (!m) return;
    byFile[m[1]] = (byFile[m[1]] || 0) + 1;
    byCode[m[4]] = (byCode[m[4]] || 0) + 1;
  });
  Object.entries(byFile).sort((a, b) => b[1] - a[1]).forEach(([f, c]) => console.log(' ', String(c).padStart(4), f));
  Object.entries(byCode).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(' ', String(n).padStart(4), c));
}
// 2) ذيل مخرجات البناء
if (fs.existsSync('build_output.txt')) {
  const t = fs.readFileSync('build_output.txt', 'utf8');
  const tail = t.split(/\r?\n/).filter(l => l.trim()).slice(-20);
  console.log('\n--- Build output (tail) ---');
  console.log(tail.join('\n'));
}