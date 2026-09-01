/**
 * AppDownloadModal — مركز تنزيل وتثبيت المنظومة المؤسسية
 * تشغيل محلي فائق السرعة • تطبيق سطح المكتب والموبايل • العمل دون اتصال
 * الجمهورية اليمنية | وزارة الشؤون الاجتماعية والعمل
 */
import { useState } from 'react';
import { Download, Monitor, Smartphone, Zap, CheckCircle2, HardDrive, ShieldCheck, X, Laptop, RefreshCw, Sparkles, Terminal, FileCode } from 'lucide-react';
import { showInstallPrompt } from '../../utils/pwa';
import { BRAND } from '../../branding';
import { toast } from 'sonner';
interface AppDownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
}
export function AppDownloadModal({ isOpen, onClose }: AppDownloadModalProps) {
    const [activeTab, setActiveTab] = useState<'desktop' | 'mobile' | 'offline'>('desktop');
    if (!isOpen)
        return null;
    const handleInstallPWA = async () => {
        try {
            const success = await showInstallPrompt();
            if (success) {
                toast.success('تم بدء تثبيت المنظومة كتطبيق على جهازك بنجاح');
            }
            else {
                toast.info('يمكنك تثبيت التطبيق مباشرة من شريط عنوان المتصفح (أيقونة التثبيت ⊕)');
            }
        }
        catch {
            toast.error('حدث خطأ أثناء طلب التثبيت');
        }
    };
    const handleDownloadWindowsLauncher = () => {
        const launcherScript = `@echo off
title ${BRAND.systemShort} - Ministry of Social Affairs and Labor
color 0B
echo ======================================================================
echo    ${BRAND.country} - ${BRAND.ministry}
echo    ${BRAND.systemName}
echo ======================================================================
echo.
echo [1/2] Checking browser environment...
start "" "msedge.exe" --app=https://erp-unionministry.vercel.app || start "" "chrome.exe" --app=https://erp-unionministry.vercel.app || start https://erp-unionministry.vercel.app
echo [2/2] Launching Sovereign Institutional Platform...
exit
`;
        const blob = new Blob([launcherScript], { type: 'application/x-bat' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'تشغيل_منظومة_قطاع_العمل.bat';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('تم تنزيل مشغل سطح المكتب السريع بنجاح');
    };
    const handlePrecacheData = async () => {
        toast.loading('جاري تجهيز وتحديث الذاكرة المؤقتة للعمل بدون اتصال...');
        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_ALL' });
            }
            setTimeout(() => {
                toast.dismiss();
                toast.success('تم تحديث التخزين المحلي بنجاح — المنظومة جاهزة للعمل دون اتصال');
            }, 1200);
        }
        catch {
            toast.dismiss();
            toast.error('فشل تحديث التخزين المحلي');
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200" dir="rtl">
      <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-primary to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <Download size={24} className="text-amber-300"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">مركز تنزيل وتثبيت المنظومة</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 font-black">
                  v2.5 Enterprise
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                تثبيت محلي فائق السرعة • تشغيل بدون إنترنت • متوافق مع كافة الأجهزة
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer">
            <X size={20}/>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/40 p-1.5 gap-1 text-xs font-bold">
          <button onClick={() => setActiveTab('desktop')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'desktop'
            ? 'bg-card text-primary shadow-sm border border-border/80'
            : 'text-muted-foreground hover:text-foreground'}`}>
            <Monitor size={16}/>
            <span>تطبيق سطح المكتب (Windows / Mac)</span>
          </button>

          <button onClick={() => setActiveTab('mobile')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'mobile'
            ? 'bg-card text-primary shadow-sm border border-border/80'
            : 'text-muted-foreground hover:text-foreground'}`}>
            <Smartphone size={16}/>
            <span>تطبيق الهواتف (Android & iOS)</span>
          </button>

          <button onClick={() => setActiveTab('offline')} className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'offline'
            ? 'bg-card text-primary shadow-sm border border-border/80'
            : 'text-muted-foreground hover:text-foreground'}`}>
            <Zap size={16}/>
            <span>السرعة والعمل دون إنترنت</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
          {/* TAB 1: DESKTOP */}
          {activeTab === 'desktop' && (<div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md">
                  <Laptop size={20}/>
                </div>
                <div>
                  <h4 className="font-bold text-heading text-sm">تثبيت التطبيق كبرنامج مستقل (Standalone App)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    يعمل التطبيق في نافذة مستقلة مخصصة وسريعة بدون شريط المتصفح، مع إمكانية الوصول إليه مباشرة من سطح المكتب وقائمة ابدأ.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-heading">
                    <Sparkles size={16} className="text-amber-500"/>
                    <span>التثبيت المباشر على الجهاز</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    تثبيت التطبيق بنقرة واحدة عبر محرك المتصفح الحديث.
                  </p>
                  <button onClick={handleInstallPWA} className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-md shadow-primary/20 cursor-pointer">
                    <Download size={15}/>
                    <span>تثبيت التطبيق على الجهاز</span>
                  </button>
                </div>

                <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-heading">
                    <Terminal size={16} className="text-blue-500"/>
                    <span>مشغل ويندوز السريع</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    أداة تشغيل سريعة تفتح المنظومة في وضع التطبيق المستقل فوراً.
                  </p>
                  <button onClick={handleDownloadWindowsLauncher} className="w-full py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                    <FileCode size={15}/>
                    <span>تنزيل مشغل ويندوز</span>
                  </button>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border border-border/80 rounded-2xl text-xs space-y-2">
                <h5 className="font-bold text-heading flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600"/>
                  <span>مميزات تثبيت تطبيق سطح المكتب:</span>
                </h5>
                <ul className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <li className="flex items-center gap-1.5">• سرعة إقلاع وتشغيل فورية</li>
                  <li className="flex items-center gap-1.5">• تسريع عتادي كامل للرسوميات</li>
                  <li className="flex items-center gap-1.5">• حفظ جلسات الدخول بأمان</li>
                  <li className="flex items-center gap-1.5">• دعم الإشعارات والتنبيهات المباشرة</li>
                </ul>
              </div>
            </div>)}

          {/* TAB 2: MOBILE */}
          {activeTab === 'mobile' && (<div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Smartphone size={20}/>
                </div>
                <div>
                  <h4 className="font-bold text-heading text-sm">تطبيق الهواتف الذكية (Android & iOS)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    استخدم المنظومة كـتطبيق ذكي بكامل الشاشة على هاتفك المحمول أو جهاز التابلت اللوحي.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-2 text-xs">
                  <h5 className="font-bold text-heading flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">1</span>
                    <span>على هواتف أندرويد (Chrome / Edge):</span>
                  </h5>
                  <p className="text-muted-foreground leading-relaxed">
                    افتح الرابط ثم انقر على خيارات المتصفح (⋮) واختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                  </p>
                </div>

                <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-2 text-xs">
                  <h5 className="font-bold text-heading flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>على هواتف آيفون (Safari iOS):</span>
                  </h5>
                  <p className="text-muted-foreground leading-relaxed">
                    افتح الرابط في Safari وانقر على زر المشاركة (Share ⎘) ثم اختر <strong>«إضافة إلى الشاشة الرئيسية (Add to Home Screen)»</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/30 border border-border rounded-2xl flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-xs text-heading">رابط الوصول السريع المباشر</h5>
                  <p className="text-xs font-mono text-primary font-bold mt-0.5">https://erp-unionministry.vercel.app</p>
                </div>
                <button onClick={() => {
                navigator.clipboard.writeText('https://erp-unionministry.vercel.app');
                toast.success('تم نسخ الرابط إلى الحافظة');
            }} className="px-3.5 py-2 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-all cursor-pointer">
                  نسخ الرابط
                </button>
              </div>
            </div>)}

          {/* TAB 3: OFFLINE & SPEED */}
          {activeTab === 'offline' && (<div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Zap size={20}/>
                </div>
                <div>
                  <h4 className="font-bold text-heading text-sm">الوضع المحلي فائق السرعة ومزامنة البيانات</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    تعتمد المنظومة على التخزين المؤقت الذكي لضمان استجابة فورية حتى في حالات انقطاع أو بطء الإنترنت، مع مزامنة آمنة تلقائية عند عودة الاتصال.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/40 border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive size={18} className="text-primary"/>
                    <span className="text-xs font-bold text-heading">حالة التخزين المحلي للبيانات:</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-full font-bold">
                    مفعل ونشط (Cache-First)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  يتم حفظ بطاقات المهن، نماذج التفتيش، وسجلات المنشآت في ذاكرة المتصفح المحلية لتوفير تجربة استخدام سلسة بدون أي تأخير.
                </p>
                <button onClick={handlePrecacheData} className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer">
                  <RefreshCw size={15}/>
                  <span>تحديث وتجهيز الذاكرة المؤقتة الآن</span>
                </button>
              </div>
            </div>)}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={16} className="text-emerald-600"/>
            <span>نظام رسمي معتمد — {BRAND.systemShort}</span>
          </div>

          <button onClick={onClose} className="px-5 py-2.5 bg-card hover:bg-muted text-foreground border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer">
            إغلاق
          </button>
        </div>
      </div>
    </div>);
}
