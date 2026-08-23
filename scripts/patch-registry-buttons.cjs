const fs = require('fs');
const NL = String.fromCharCode(10);
const p = 'src/app/pages/ministry/NationalDirectoriesManagement.tsx';
let s = fs.readFileSync(p, 'utf8');

// 1) إضافة دالتي الاستيراد/التصدير العام قبل handleExport
const exportAnchor = '    const handleExport = () => {';
if (!s.includes('handleRegistryExport')) {
  const registryFns = [
    '    // تصدير عام لأي سجل (JSON)',
    '    const handleRegistryExport = async () => {',
    '        try {',
    '            const r = await fetch(`/api/registry/export?table=national_directories`);',
    '            if (!r.ok) { toast.error(\'فشل التصدير العام\'); return; }',
    '            const d = await r.json();',
    '            const blob = new Blob([JSON.stringify(d.data, null, 2)], { type: \'application/json\' });',
    '            const url = URL.createObjectURL(blob);',
    '            const a = document.createElement(\'a\');',
    '            a.href = url;',
    '            a.download = `national_directories_${new Date().toISOString().slice(0,10)}.json`;',
    '            document.body.appendChild(a); a.click(); document.body.removeChild(a);',
    '            URL.revokeObjectURL(url);',
    '            toast.success(`تم تصدير ${d.count} سجل عام`);',
    '            logAudit({ action: \'export\', resource: \'registry\', details: { table: \'national_directories\', count: d.count } });',
    '        } catch { toast.error(\'خطأ في التصدير العام\'); }',
    '    };',
    '',
    '    // استيراد عام لأي سجل (JSON)',
    '    const handleRegistryImport = async () => {',
    '        const input = document.createElement(\'input\');',
    '        input.type = \'file\'; input.accept = \'.json\';',
    '        input.onchange = async (e) => {',
    '            const file = (e.target as HTMLInputElement).files?.[0];',
    '            if (!file) return;',
    '            try {',
    '                const text = await file.text();',
    '                const parsed = JSON.parse(text);',
    '                const rows = Array.isArray(parsed) ? parsed : (parsed.data || []);',
    '                if (rows.length === 0) { toast.warning(\'لا توجد بيانات في الملف\'); return; }',
    '                const r = await fetch(\'/api/registry/import\', {',
    '                    method: \'POST\',',
    '                    headers: { \'Content-Type\': \'application/json\' },',
    '                    body: JSON.stringify({ table: \'national_directories\', rows }),',
    '                });',
    '                const d = await r.json();',
    '                if (r.ok) {',
    '                    toast.success(`تم استيراد ${d.imported} من ${d.total} سجل`);',
    '                    logAudit({ action: \'import\', resource: \'registry\', details: { table: \'national_directories\', imported: d.imported } });',
    '                    loadEntries();',
    '                } else { toast.error(d.error || \'فشل الاستيراد\'); }',
    '            } catch { toast.error(\'ملف JSON غير صالح\'); }',
    '        };',
    '        input.click();',
    '    };',
    '',
  ].join(NL);
  s = s.replace(exportAnchor, registryFns + exportAnchor);
}

// 2) إضافة الأزرار في شريط الإجراءات (بعد زر Excel) — تُضاف دائماً
const excelBtn = '                            <Download size={16} /> Excel';
if (s.includes(excelBtn) && !s.includes('تصدير JSON')) {
  const newBtns = [
    '                            <Download size={16} /> Excel',
    '                        </button>',
    '                        <button onClick={handleRegistryExport} className="flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors shadow-sm" title="تصدير عام JSON">',
    '                            <Download size={16} /> تصدير JSON',
    '                        </button>',
    '                        <button onClick={handleRegistryImport} className="flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-colors shadow-sm" title="استيراد عام JSON">',
    '                            <Upload size={16} /> استيراد',
  ].join(NL);
  s = s.replace(excelBtn, newBtns);
}

// إضافة استيراد Upload من lucide (مرة واحدة فقط)
if (s.includes('handleRegistryImport') && !s.includes('Upload,')) {
  s = s.replace(
    'Download, ChevronRight, ChevronLeft',
    'Download, ChevronRight, ChevronLeft, Upload'
  );
}
// إزالة أي تكرار لـ Upload في سطر الاستيراد
const importLine = s.split('\n').find(l => l.includes('Upload,'));
if (importLine && (importLine.match(/Upload/g) || []).length > 1) {
  const cleaned = importLine.replace(/Upload,\s*/g, '').replace(/,\s*Upload/g, '');
  s = s.replace(importLine, cleaned + ' Upload,');
}

fs.writeFileSync(p, s, 'utf8');
console.log('patched-registry-buttons');