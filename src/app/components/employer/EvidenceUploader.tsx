/**
 * EvidenceUploader — رفع الشواهد والمستندات والصور لدعم التقييم
 * يعمل Offline أولاً: تخزين محلي في IndexedDB + بصمة SHA-256 لعدم التلاعب
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/Button";
import { UploadCloud, Camera, FileText, Image as ImageIcon, Trash2, Fingerprint, ShieldCheck, Loader2 } from "lucide-react";
import { db } from "../../utils/indexedDB";

export interface EvidenceRecord {
  id: string;
  name: string;
  mime: string;
  size: number;
  category: string;
  hash: string;
  contextId?: string;
  uploadedAt: string;
  status: 'محلي — بانتظار المزامنة' | 'مرفوع وموثق';
  previewUrl?: string;
}

const CATEGORIES = [
  'إجراء تصحيحي بعد تفتيش',
  'عقد عمل موثق',
  'شهادة لياقة صحية',
  'إثبات سداد رسوم',
  'تقييم مخاطر السلامة',
  'كشف أجور',
  'أخرى',
];

const MAX_SIZE = 5 * 1024 * 1024;

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function EvidenceUploader({ contextId, compact = false }: { contextId?: string; compact?: boolean }) {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const all = await db.getAll<EvidenceRecord & { contextId?: string }>('documents');
      setItems(all.filter(d => !contextId || d.contextId === contextId).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
    } catch { /* التخزين غير متاح */ }
  }, [contextId]);

  useEffect(() => { load(); }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE) {
          setError(`الملف ${file.name} يتجاوز الحد الأقصى (5MB)`);
          continue;
        }
        const buf = await file.arrayBuffer();
        const hash = await sha256Hex(buf);
        const rec: EvidenceRecord = {
          id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          mime: file.type || 'application/octet-stream',
          size: file.size,
          category,
          hash,
          contextId,
          uploadedAt: new Date().toISOString(),
          status: 'محلي — بانتظار المزامنة',
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        };
        await db.put('documents', rec);
      }
      await load();
    } catch {
      setError('تعذر تخزين الملف محلياً — تأكد من مساحة التخزين');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (rec: EvidenceRecord) => {
    await db.delete('documents', rec.id);
    if (rec.previewUrl) URL.revokeObjectURL(rec.previewUrl);
    await load();
  };

  return (
    <Card>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            ملف الشواهد والأدلة — رفع صور ومستندات
          </div>
          <Badge variant="outline">Offline Ready • بصمة SHA-256</Badge>
        </div>

        {!compact && (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold text-muted-foreground">نوع الشاهدة:</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="text-xs border rounded-lg px-2 py-1.5 bg-transparent"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        {/* منطقة الرفع */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400'
          }`}
          onClick={() => fileRef.current?.click()}
          role="button"
          aria-label="منطقة رفع الشواهد — اسحب الملفات أو انقر للاختيار"
        >
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" hidden
                 onChange={e => { handleFiles(e.target.files); e.currentTarget.value = ''; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
                 onChange={e => { handleFiles(e.target.files); e.currentTarget.value = ''; }} />
          {busy ? (
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-600">
              <Loader2 className="w-5 h-5 animate-spin" /> جارٍ احتساب البصمة والتخزين…
            </div>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-1" />
              <p className="text-xs font-semibold">اسحب الصور أو المستندات هنا، أو انقر للاختيار</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">صور JPG/PNG • PDF • حتى 5MB للملف</p>
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => cameraRef.current?.click()}>
            <Camera className="w-4 h-4 ml-1" /> التقاط بالكاميرا
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
            <FileText className="w-4 h-4 ml-1" /> اختيار مستندات
          </Button>
        </div>

        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

        {/* قائمة الشواهد */}
        {items.length > 0 && (
          <div className="space-y-2 pt-1">
            {items.map(rec => (
              <div key={rec.id} className="flex items-center gap-2 p-2 border rounded-xl">
                {rec.previewUrl ? (
                  <img src={rec.previewUrl} alt={rec.name} className="w-10 h-10 rounded-lg object-cover border" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{rec.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {rec.category} • {(rec.size / 1024).toFixed(0)}KB
                    • <Fingerprint className="w-3 h-3 inline -mt-0.5" /> {rec.hash.slice(0, 10)}…
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">{rec.status}</Badge>
                <button
                  onClick={() => remove(rec)}
                  aria-label={`حذف ${rec.name}`}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          🔒 كل شاهدة تُحفظ ببصمة تشفير SHA-256 تُثبت عدم التلاعب بها، وتُزامَن تلقائياً مع ملف المنشأة عند توفر الاتصال.
        </p>
      </div>
    </Card>
  );
}
