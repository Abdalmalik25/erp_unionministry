const fs = require('fs');
const content = fs.readFileSync('src/app/i18n/config.ts', 'utf8');
let braceCount = 0;
let inString = false;
let stringChar = '';
let lineNum = 1;
for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '\n') lineNum++;
  if (!inString) {
    if (char === '"' || char === "'") {
      inString = true;
      stringChar = char;
    } else if (char === '{') braceCount++;
    else if (char === '}') {
      braceCount--;
      if (braceCount < 0) {
        console.log('NEGATIVE at line', lineNum);
        break;
      }
    }
  } else if (char === stringChar && content[i-1] !== '\\') {
    inString = false;
  }
  if (braceCount === 0 && lineNum > 10) {
    console.log('Brace count 0 at line', lineNum);
  }
}
console.log('Final brace count:', braceCount);