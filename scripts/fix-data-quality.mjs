// scripts/fix-data-quality.mjs — تعريب مركز جودة البيانات
import fs from 'fs';

const file = 'src/app/pages/DataQualityCenter.tsx';
let s = fs.readFileSync(file, 'utf8');

const reps = [
  ['مركز جودة البيانات — Data Quality Center', 'مركز جودة البيانات الوطني'],
  ['كشف التكرار • الأيتام • الأكواد غير الصالحة • التعارض التاريخي — كل نتيجة → Case للتنظيف',
   'كشف السجلات المكررة والمعزولة والأكواد غير الصحيحة والتعارضات التاريخية — كل نتيجة تُحوّل تلقائياً إلى معاملة معالجة موثقة'],
  ['تكرار الأشخاص</div><div className="text-muted-foreground">national_id مكرر — ONE PERSON ONE IDENTITY',
   'تكرار الأشخاص</div><div className="text-muted-foreground">رقم واحد لكل شخص — هوية وطنية موحدة'],
  ['تكرار المنشآت</div><div className="text-muted-foreground">entity_number + السجل',
   'تكرار المنشآت</div><div className="text-muted-foreground">رقم الكيان + السجل الرسمي'],
  ['أيتام وعقود بأكواد غير صالحة</div><div className="text-muted-foreground">orphan_contract / invalid_code',
   'سجلات معزولة وأكواد غير صحيحة</div><div className="text-muted-foreground">عقود بلا مرجع أو برمز غير مطابق'],
  ['<div><div className="font-medium text-sm">{f.check_type}</div><div className="text-xs text-muted-foreground truncate max-w-[420px]">{JSON.stringify(f.details||{}).slice(0,140)}</div></div>',
   '<div><div className="font-medium text-sm">{ {duplicate_person:\'تكرار سجل شخص\', duplicate_establishment:\'تكرار سجل منشأة\', orphan_contract:\'عقد بمرجع ناقص\', invalid_code:\'رمز غير صحيح\'}[f.check_type] || \'نتيجة فحص\' }</div><div className="text-xs text-muted-foreground truncate max-w-[420px]">{f.description || \'يوصى بالمعالجة من قبل أمين البيانات\'}</div></div>'],
  [">{f.severity}</Badge>",
   ">{ {critical:'بالغة الأهمية', warning:'تنبيه', info:'للعلم'}[f.severity] || f.severity }</Badge>"],
];

let missing = 0;
for (const [a, b] of reps) {
  if (!s.includes(a)) { console.error('NOT FOUND:', a.substring(0, 55)); missing++; continue; }
  s = s.replace(a, b);
}
fs.writeFileSync(file, s, 'utf8');
console.log(missing ? `${missing} missed` : 'DataQualityCenter done');
