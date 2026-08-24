// scripts/rebrand-union-sphere.mjs — توحيد الهوية الرسمية في التعليقات والسلاسل الوصفية
import fs from 'fs';
import path from 'path';

const OLD = /UnionSphere Enterprise Platform|منصة UnionSphere|UnionSphere Enterprise Ministry Core API|UnionSphere AI-LaborBrain v2\.5|UnionSphere Security Test/g;
const NEW_MAP = [
  [/منصة UnionSphere \| وزارة الشؤون الاجتماعية والعمل - قطاع العمل/g, 'المنظومة الوطنية للعمل النقابي | وزارة الشؤون الاجتماعية والعمل - قطاع العمل'],
  [/منصة UnionSphere \| وزارة الشؤون الاجتماعية والعمل/g, 'المنظومة الوطنية للعمل النقابي | وزارة الشؤون الاجتماعية والعمل'],
  [/UnionSphere Enterprise Ministry Core API/g, 'National Labor Platform Core API'],
  [/UnionSphere AI-LaborBrain v2\.5/g, 'MOSAL AI-LaborBrain v2.5'],
  [/UnionSphere Security Test 🎯/g, 'MOSAL Security Test 🎯'],
  [/UnionSphere Enterprise Platform — Supabase Schema/g, 'National Labor Platform — Schema'],
  [/UnionSphere Enterprise — PRODUCTION MIGRATION v5\.0/g, 'National Labor Platform — Production Migration'],
  [/UnionSphere Enterprise Platform — Enhanced Schema Migration/g, 'National Labor Platform — Enhanced Schema Migration'],
  [/UnionSphere Enterprise — ULTIMATE Comprehensive Schema v4\.0/g, 'National Labor Platform — Comprehensive Schema'],
  [/UnionSphere Seed Data - البيانات الابتدائية/g, 'بيانات المنظومة الوطنية الابتدائية'],
  [/دمج بيانات NOAS \+ UnionSphere وفق أفضل الممارسات العالمية/g, 'وفق أفضل الممارسات العالمية'],
  [/دمج كامل لبيانات NOAS \+ UnionSphere/g, 'المخطط الشامل الرسمي'],
  [/UnionSphere Design System/g, 'نظام التصميم المؤسسي'],
  [/UnionSphere Enterprise - الأمان الحكومي/g, 'الأمان الحكومي — وزارة الشؤون الاجتماعية والعمل'],
];

let changed = [];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|js|sql|md)$/.test(f)) {
      let s = fs.readFileSync(p, 'utf8');
      const before = s;
      // استثناء مقصد: اسم قاعدة IndexedDB (توافق البيانات دون اتصال)
      if (p.includes('indexedDB.ts')) continue;
      for (const [re, rep] of NEW_MAP) s = s.replace(re, rep);
      if (s !== before) { fs.writeFileSync(p, s, 'utf8'); changed.push(p); }
    }
  }
}
walk('src');
walk('server');
console.log('changed files:', changed.length);
changed.forEach(x => console.log(' ', x));
