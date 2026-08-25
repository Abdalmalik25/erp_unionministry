// تحقق حي من توصيل الأيقونات الرسمية بعد النشر
const BASE = 'https://erp-unionministry.vercel.app';

const html = await (await fetch(BASE)).text();
console.log('head links wired:',
  html.includes('/favicon.ico') &&
  html.includes('/apple-touch-icon.png') &&
  html.includes('favicon-32x32.png') &&
  !html.includes('favicon.svg'));

for (const p of [
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
]) {
  const r = await fetch(`${BASE}/${p}`);
  const type = r.headers.get('content-type') || '';
  console.log(`${p} => ${r.status} ${type.split(';')[0]}`);
}

const m = await (await fetch(`${BASE}/manifest.json`)).json();
console.log('manifest name:', m.name);
console.log('manifest icons:', m.icons.map(i => `${i.src}|${i.purpose}`).join(' , '));

const sw = await (await fetch(`${BASE}/sw.js`)).text();
console.log('sw version v5:', sw.includes("CACHE_VERSION = 'v5'"));
console.log('sw no broken refs:', !sw.includes('favicon.svg') && !sw.includes('src/imports/image.png'));
