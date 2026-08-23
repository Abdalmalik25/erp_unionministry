const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'src/app/pages/ministry/NationalDirectoriesManagement.tsx';
const lines = fs.readFileSync(p, 'utf8').split(NL);
for (let i = 5; i < 11; i++) {
  console.log('LINE ' + (i + 1) + ': [' + lines[i] + ']');
}