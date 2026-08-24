// scripts/clean-build.mjs — تنظيف مخرجات البناء والتخزين المؤقت (متعدد المنصات)
import fs from 'fs';

for (const dir of ['dist', 'node_modules/.vite']) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`✓ أُزيل ${dir}`);
  } else {
    console.log(`- ${dir} غير موجود`);
  }
}
