/**
 * PWA Install Wizard - معالج التثبيت التفاعلي المتقدم
 * Professional installation experience with security verification,
 * platform detection, and full user control
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, AlertTriangle, X, ChevronRight, ChevronLeft,
  Smartphone, Monitor, Download, Trash2, RefreshCw, Bell, Wifi,
  Database, Settings, Eye, EyeOff, Info, Zap, ShieldCheck, RotateCcw
} from 'lucide-react';
import {
  detectPlatform, getPlatformName, isInstalled, getDisplayMode,
  canInstall, triggerInstall, runSecurityAudit, formatBytes,
  getCacheInfo, clearAllCaches, clearApiCache, getSettings, saveSettings,
  resetSettings, checkForUpdates, applyUpdate, recordInstallAttempt,
  recordInstallOutcome, getIOSInstallSteps, getInstallAnalytics,
  type Platform, type SecurityReport, type CacheInfo, type PwaSettings,
  type InstallProgress, type SecurityCheck, type IOSInstallStep
} from '../utils/pwaAdvanced';

type WizardStep = 'welcome' | 'platform' | 'security' | 'install' | 'settings' | 'complete';

interface WizardProps {
  onComplete?: () => void;
  onCancel?: () => void;
  initialStep?: WizardStep;
}

export function PwaInstallWizard({ onComplete, onCancel, initialStep = 'welcome' }: WizardProps) {
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [settings, setSettings] = useState<PwaSettings | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [installResult, setInstallResult] = useState<'success' | 'dismissed' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [installAnalytics] = useState(getInstallAnalytics);

  // Initialize
  useEffect(() => {
    setPlatform(detectPlatform());
    setIsPWAInstalled(isInstalled());
    setIsInstallable(canInstall());
    setSettings(getSettings());
  }, []);

  // Load data on specific steps
  useEffect(() => {
    if (step === 'security') {
      setIsLoading(true);
      Promise.all([runSecurityAudit(), getCacheInfo()]).then(([sec, cache]) => {
        setSecurityReport(sec);
        setCacheInfo(cache);
        setIsLoading(false);
      });
    }
  }, [step]);

  // Steps navigation
  const nextStep = useCallback(() => {
    const steps: WizardStep[] = ['welcome', 'platform', 'security', 'install', 'settings', 'complete'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1]);
    }
  }, [step]);

  const prevStep = useCallback(() => {
    const steps: WizardStep[] = ['welcome', 'platform', 'security', 'install', 'settings', 'complete'];
    const idx = steps.indexOf(step);
    if (idx > 0) {
      setStep(steps[idx - 1]);
    }
  }, [step]);

  // Install handler
  const handleInstall = async () => {
    setIsLoading(true);
    recordInstallAttempt('wizard');

    // Simulate progress steps
    setProgress({ step: 0, total: 4, currentStep: 'جاري التثبيت...', currentStepEn: 'Installing...', percent: 0, completed: false });

    await new Promise((r) => setTimeout(r, 500));
    setProgress({ step: 1, total: 4, currentStep: 'التحقق من المتطلبات...', currentStepEn: 'Checking requirements...', percent: 25, completed: false });

    await new Promise((r) => setTimeout(r, 500));
    setProgress({ step: 2, total: 4, currentStep: 'تحميل التطبيق...', currentStepEn: 'Loading app...', percent: 50, completed: false });

    await new Promise((r) => setTimeout(r, 500));
    setProgress({ step: 3, total: 4, currentStep: 'إنشاء اختصارات...', currentStepEn: 'Creating shortcuts...', percent: 75, completed: false });

    const outcome = await triggerInstall();
    recordInstallOutcome(outcome);

    if (outcome === 'accepted') {
      setInstallResult('success');
      setIsPWAInstalled(true);
      setProgress({ step: 4, total: 4, currentStep: 'تم التثبيت بنجاح!', currentStepEn: 'Installed successfully!', percent: 100, completed: true });
    } else {
      setInstallResult('dismissed');
      setProgress({ step: 4, total: 4, currentStep: 'تم إلغاء التثبيت', currentStepEn: 'Installation dismissed', percent: 100, completed: false });
    }

    setIsLoading(false);
    setTimeout(() => {
      if (outcome === 'accepted') {
        nextStep();
      }
    }, 1500);
  };

  // Cache management
  const handleClearAll = async () => {
    setIsLoading(true);
    await clearAllCaches();
    const cache = await getCacheInfo();
    setCacheInfo(cache);
    setIsLoading(false);
  };

  const handleClearApi = async () => {
    setIsLoading(true);
    await clearApiCache();
    const cache = await getCacheInfo();
    setCacheInfo(cache);
    setIsLoading(false);
  };

  // Settings management
  const handleSettingChange = (key: keyof PwaSettings, value: boolean | string | number) => {
    const updated = saveSettings({ [key]: value });
    setSettings(updated);
  };

  const handleResetSettings = () => {
    const defaults = resetSettings();
    setSettings(defaults);
  };

  // Update management
  const handleCheckUpdates = async () => {
    setIsLoading(true);
    const update = await checkForUpdates();
    if (update.available) {
      await applyUpdate();
    }
    setIsLoading(false);
  };

  // Security check badge
  const SecurityBadge = ({ check }: { check: SecurityCheck }) => (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      check.passed ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950' : 'border-amber-200 bg-amber-50 dark:bg-amber-950'
    }`}>
      {check.passed
        ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        : <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${check.critical ? 'text-red-500' : 'text-amber-500'}`} />
      }
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{check.name}</div>
        {check.warning && (
          <div className="text-xs text-muted-foreground mt-0.5">{check.warning}</div>
        )}
      </div>
    </div>
  );

  // Progress bar
  const ProgressBar = () => {
    if (!progress) return null;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span>{progress.currentStep}</span>
          <span className="text-muted-foreground">{progress.percent}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground text-center">
          {progress.step} / {progress.total}
        </div>
      </div>
    );
  };

  // Step: Welcome
  const WelcomeStep = () => (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 mx-auto bg-primary/10 rounded-3xl flex items-center justify-center">
        <Zap className="w-10 h-10 text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">مرحباً بك في المنظومة الوطنية للعمل</h2>
        <p className="text-muted-foreground">تحويل تجربتك إلى تطبيق مستقل يمنحك أداءً فائقاً وتجربة احترافية</p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-left">
        <div className="p-4 rounded-xl bg-card border">
          <Zap className="w-6 h-6 text-amber-500 mb-2" />
          <div className="font-semibold">أداء فائق</div>
          <div className="text-xs text-muted-foreground">أسرع من المتصفح بكثير</div>
        </div>
        <div className="p-4 rounded-xl bg-card border">
          <Smartphone className="w-6 h-6 text-blue-500 mb-2" />
          <div className="font-semibold">يعمل بدون إنترنت</div>
          <div className="text-xs text-muted-foreground">وصول كامل في الميدان</div>
        </div>
        <div className="p-4 rounded-xl bg-card border">
          <Shield className="w-6 h-6 text-emerald-500 mb-2" />
          <div className="font-semibold">آمن تماماً</div>
          <div className="text-xs text-muted-foreground">مشفر ومحمي</div>
        </div>
        <div className="p-4 rounded-xl bg-card border">
          <Monitor className="w-6 h-6 text-purple-500 mb-2" />
          <div className="font-semibold">أيقونة على سطح المكتب</div>
          <div className="text-xs text-muted-foreground">وصول سريع دائماً</div>
        </div>
      </div>
    </div>
  );

  // Step: Platform
  const PlatformStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">منصتك</h2>
        <p className="text-muted-foreground text-sm">تم الكشف عن جهازك تلقائياً</p>
      </div>
      <div className="p-6 rounded-2xl bg-card border text-center space-y-3">
        <div className="text-4xl">
          {platform.startsWith('ios') ? '📱' :
           platform.startsWith('android') ? '🤖' :
           platform.includes('windows') ? '🪟' :
           platform.includes('macos') ? '🍎' :
           platform.includes('linux') ? '🐧' : '💻'}
        </div>
        <div className="font-bold text-lg">{getPlatformName(platform)}</div>
        <div className="text-sm text-muted-foreground">
          {platform.startsWith('ios') ? 'اتبع التعليمات أدناه للتثبيت' :
           platform.includes('android') ? 'التثبيت متاح مباشرة من كروم' :
           'التثبيت متاح مباشرة من متصفحك'}
        </div>
      </div>
      {platform.startsWith('ios-') && (
        <div className="space-y-4">
          <h3 className="font-semibold text-center">خطوات التثبيت</h3>
          {getIOSInstallSteps().map((step: IOSInstallStep) => (
            <div key={step.step} className="flex gap-4 p-4 rounded-xl bg-card border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary flex-shrink-0">
                {step.step}
              </div>
              <div>
                <div className="font-semibold">{step.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isPWAInstalled && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <div className="font-semibold text-emerald-800">التطبيق مثبت بالفعل!</div>
          <div className="text-sm text-emerald-600 mt-1">التطبيق يعمل حالياً في وضع {getDisplayMode()}</div>
        </div>
      )}
    </div>
  );

  // Step: Security
  const SecurityStep = () => {
    if (isLoading || !securityReport || !cacheInfo) {
      return (
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-1/3 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className={`text-5xl font-black mb-2 ${
            securityReport.score >= 80 ? 'text-emerald-600' :
            securityReport.score >= 60 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {securityReport.score}%
          </div>
          <div className="text-muted-foreground">درجة الأمان</div>
        </div>

        <div className="space-y-2">
          {securityReport.checks.map((check) => (
            <SecurityBadge key={check.id} check={check} />
          ))}
        </div>

        <div className="p-4 rounded-xl bg-card border">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-5 h-5 text-primary" />
            <span className="font-semibold">استخدام التخزين</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الثوابت</span>
              <span>{formatBytes(cacheInfo.static)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">البيانات</span>
              <span>{formatBytes(cacheInfo.api)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الأخرى</span>
              <span>{formatBytes(cacheInfo.dynamic)}</span>
            </div>
            <div className="pt-2 border-t flex justify-between font-semibold">
              <span>الإجمالي</span>
              <span>{formatBytes(cacheInfo.total)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClearApi}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            <span className="text-sm">مسح البيانات</span>
          </button>
          <button
            onClick={handleClearAll}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border hover:bg-destructive/10 text-destructive transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">مسح كل شيء</span>
          </button>
        </div>
      </div>
    );
  };

  // Step: Install
  const InstallStep = () => (
    <div className="space-y-6">
      {progress ? (
        <ProgressBar />
      ) : isPWAInstalled ? (
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto" />
          <div className="font-bold text-lg">التطبيق مثبت</div>
          <div className="text-muted-foreground">يمكنك التحكم في الإعدادات أو التحقق من التحديثات</div>
        </div>
      ) : isInstallable ? (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Download className="w-10 h-10 text-primary" />
          </div>
          <div className="font-bold text-lg">جاهز للتثبيت</div>
          <div className="text-muted-foreground">اضغط الزر أدناه لبدء التثبيت</div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <AlertTriangle className="w-16 h-16 text-amber-600 mx-auto" />
          <div className="font-bold text-lg">التثبيت غير متاح</div>
          <div className="text-muted-foreground">متصفحك لا يدعم التثبيت المباشر. استخدم سفاري على iOS أو كروم على أندرويد.</div>
        </div>
      )}

      {!isPWAInstalled && (
        <button
          onClick={handleInstall}
          disabled={isLoading || !isInstallable}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>جاري التثبيت...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>تثبيت التطبيق الآن</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  // Step: Settings
  const SettingsStep = () => {
    if (!settings) return null;
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Settings className="w-8 h-8 mx-auto mb-2 text-primary" />
          <h3 className="font-bold">إعدادات التطبيق</h3>
        </div>

        <div className="space-y-4">
          {/* Auto Update */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-sm">التحديث التلقائي</div>
                <div className="text-xs text-muted-foreground">تحديث التطبيق تلقائياً عند توفره</div>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('autoUpdate', !settings.autoUpdate)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.autoUpdate ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.autoUpdate ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Background Sync */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-sm">المزامنة في الخلفية</div>
                <div className="text-xs text-muted-foreground">مزامنة البيانات عند عودة الاتصال</div>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('backgroundSync', !settings.backgroundSync)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.backgroundSync ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.backgroundSync ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-sm">الإشعارات</div>
                <div className="text-xs text-muted-foreground">استلام إشعارات مهمة</div>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('pushNotifications', !settings.pushNotifications)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.pushNotifications ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.pushNotifications ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Offline Mode */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-sm">العمل بدون إنترنت</div>
                <div className="text-xs text-muted-foreground">الوصول للبيانات محلياً</div>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('offlineMode', !settings.offlineMode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.offlineMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.offlineMode ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Analytics */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-card border">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-sm">تحليلات الاستخدام</div>
                <div className="text-xs text-muted-foreground">تحسين الأداء والتجربة</div>
              </div>
            </div>
            <button
              onClick={() => handleSettingChange('analyticsEnabled', !settings.analyticsEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.analyticsEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.analyticsEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        <button
          onClick={handleCheckUpdates}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="text-sm">التحقق من التحديثات</span>
        </button>

        <button
          onClick={handleResetSettings}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">إعادة تعيين الإعدادات</span>
        </button>
      </div>
    );
  };

  // Step: Complete
  const CompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
        <ShieldCheck className="w-10 h-10 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">تم التثبيت بنجاح!</h2>
        <p className="text-muted-foreground">المنظومة الوطنية للعمل جاهزة للاستخدام</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="p-3 rounded-xl bg-card border text-center">
          <div className="text-2xl font-bold text-primary">{installAnalytics.installSuccess || 0}</div>
          <div className="text-xs text-muted-foreground">محاولات التثبيت</div>
        </div>
        <div className="p-3 rounded-xl bg-card border text-center">
          <div className="text-2xl font-bold text-primary">{installAnalytics.installDismissed || 0}</div>
          <div className="text-xs text-muted-foreground">تجاهل</div>
        </div>
      </div>
    </div>
  );

  // Step titles
  const stepTitles: Record<WizardStep, string> = {
    welcome: 'مرحباً',
    platform: 'منصتك',
    security: 'الأمان',
    install: 'التثبيت',
    settings: 'الإعدادات',
    complete: 'اكتمل',
  };

  const steps: WizardStep[] = ['welcome', 'platform', 'security', 'install', 'settings', 'complete'];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-card border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentIdx > 0 && (
              <button
                onClick={prevStep}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <span className="font-bold">{stepTitles[step]}</span>
          </div>
          <div className="flex items-center gap-2">
            {step !== 'complete' && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onCancel}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="px-4 py-2 flex gap-1.5">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= currentIdx ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 min-h-80">
          {step === 'welcome' && <WelcomeStep />}
          {step === 'platform' && <PlatformStep />}
          {step === 'security' && <SecurityStep />}
          {step === 'install' && <InstallStep />}
          {step === 'settings' && <SettingsStep />}
          {step === 'complete' && <CompleteStep />}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          {step !== 'complete' && step !== 'install' && (
            <div className="flex gap-3">
              {step !== 'welcome' && (
                <button
                  onClick={prevStep}
                  className="flex-1 py-2.5 rounded-xl border hover:bg-muted transition-colors font-medium"
                >
                  السابق
                </button>
              )}
              <button
                onClick={nextStep}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                {step === 'settings' ? 'إنهاء' : 'التالي'}
                <ChevronLeft className="inline w-4 h-4 mr-1" />
              </button>
            </div>
          )}
          {step === 'complete' && (
            <button
              onClick={onComplete}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              فتح التطبيق
            </button>
          )}
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-card border rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <span className="font-bold">إعدادات التطبيق</span>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <SettingsStep />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * PWA Control Center - User control panel accessible from anywhere
 */
export function PwaControlCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [platform] = useState(detectPlatform());
  const [installed] = useState(isInstalled());
  const [displayMode] = useState(getDisplayMode());
  const [securityScore, setSecurityScore] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      runSecurityAudit().then((report) => setSecurityScore(report.score));
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
        title="التحكم في التطبيق"
      >
        <Settings className="w-5 h-5" />
        {installed && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-card" />
        )}
      </button>

      {/* Control panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50" onClick={() => setIsOpen(false)}>
          <div
            className="absolute bottom-20 left-4 w-72 bg-card border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-bold">منظومة العمل</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {installed ? (
                  <span className="text-emerald-600">✓ مثبت ({getPlatformName(platform)})</span>
                ) : (
                  <span className="text-amber-600">○ غير مثبت</span>
                )}
              </div>
            </div>

            <div className="p-2 space-y-1">
              {/* Security score */}
              {securityScore !== null && (
                <div className="p-3 rounded-xl bg-card border mb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">الأمان</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    securityScore >= 80 ? 'text-emerald-600' :
                    securityScore >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {securityScore}%
                  </div>
                </div>
              )}

              {/* Install/Update */}
              {!installed && (
                <button
                  onClick={() => { setIsOpen(false); setShowWizard(true); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-right"
                >
                  <Download className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">تثبيت التطبيق</span>
                </button>
              )}

              {/* Update */}
              <button
                onClick={async () => {
                  await applyUpdate();
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-right"
              >
                <RefreshCw className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">التحقق من التحديثات</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => { setIsOpen(false); setShowWizard(true); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors text-right"
              >
                <Settings className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">إعدادات التطبيق</span>
              </button>

              {/* Display mode */}
              <div className="flex items-center gap-3 p-3 text-muted-foreground text-sm">
                <Eye className="w-5 h-5" />
                <span>وضع العرض: {displayMode}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wizard modal */}
      {showWizard && (
        <PwaInstallWizard
          onComplete={() => setShowWizard(false)}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
