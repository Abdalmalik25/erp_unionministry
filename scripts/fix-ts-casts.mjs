import fs from 'fs';

// MinistryWorkspace: cast maps
let s = fs.readFileSync('src/app/pages/MinistryWorkspace.tsx', 'utf8');
s = s.replace('{ {urgent:\'عاجلة\', high:\'عالية\', medium:\'متوسطة\', low:\'منخفضة\'}[c.priority] || c.priority }',
  '{ ({urgent:\'عاجلة\', high:\'عالية\', medium:\'متوسطة\', low:\'منخفضة\'} as Record<string,string>)[c.priority] || c.priority }');
s = s.replace('{ {on_track:\'داخل المهلة\', at_risk:\'قارب الانتهاء\', overdue:\'تجاوز المهلة\'}[c.sla_status] || c.sla_status }',
  '{ ({on_track:\'داخل المهلة\', at_risk:\'قارب الانتهاء\', overdue:\'تجاوز المهلة\'} as Record<string,string>)[c.sla_status] || c.sla_status }');
s = s.replace("{ {hearing:'جلسة محددة', open:'مفتوحة', closed:'مغلقة', in_progress:'قيد التنفيذ'}[c.status] || '' }",
  "{ ({hearing:'جلسة محددة', open:'مفتوحة', closed:'مغلقة', in_progress:'قيد التنفيذ'} as Record<string,string>)[c.status] || '' }");
fs.writeFileSync('src/app/pages/MinistryWorkspace.tsx', s, 'utf8');

// AccountAdministration: cast map
let a = fs.readFileSync('src/app/pages/ministry/AccountAdministration.tsx', 'utf8');
a = a.replace('{ {INSERT:"إضافة", UPDATE:"تعديل", DELETE:"حذف", LOGIN:"تسجيل دخول", LOGOUT:"تسجيل خروج"}[a.action] || String(a.action||"").replace(/_/g," ") }',
  '{ ({INSERT:"إضافة", UPDATE:"تعديل", DELETE:"حذف", LOGIN:"تسجيل دخول", LOGOUT:"تسجيل خروج"} as Record<string,string>)[a.action] || String(a.action||"").replace(/_/g," ") }');
fs.writeFileSync('src/app/pages/ministry/AccountAdministration.tsx', a, 'utf8');

console.log('casts applied');
