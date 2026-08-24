import fs from 'fs';

const html = fs.readFileSync('dist/index.html', 'utf8');
const m = html.match(/Content-Security-Policy" content="([^"]*)/);
if (!m) { console.log('meta CSP: NONE'); process.exit(0); }
console.log('meta CSP:', m[1].substring(0, 220));
console.log('frame-ancestors in meta:', m[1].includes('frame-ancestors') ? 'YES(BAD)' : 'NO(GOOD)');
console.log("unsafe-inline in style-src:", m[1].includes("style-src 'self' 'unsafe-inline'") ? 'YES(GOOD)' : 'NO(BAD)');
