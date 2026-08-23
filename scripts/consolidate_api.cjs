const fs = require('fs');
const path = require('path');
const apiDir = path.join(__dirname, '..', 'api');

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      removeDir(full);
      fs.rmdirSync(full);
    } else {
      fs.unlinkSync(full);
    }
  }
}

removeDir(apiDir);
if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir, { recursive: true });

const content = 'import app from " ../server/index.js\;\n\nexport default app;\n';
fs.writeFileSync(path.join(apiDir, 'index.js'), content, 'utf8');
console.log('Successfully consolidated api/ into a single Serverless Function (api/index.js)');
