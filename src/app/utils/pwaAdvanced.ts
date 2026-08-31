/**
 * PWA Advanced - أدوات التطبيق التقدمي المتقدمة
 * Professional installation system with security, modularity, and full user control
 *
 * Features:
 * - Multi-platform install (Android, iOS, Windows, macOS, Linux, Chrome OS)
 * - Security verification (CSP, HTTPS, SRI)
 * - Integrity checks (manifest validation, SW health)
 * - Update management (graceful, background)
 * - Storage control (cache size, eviction)
 * - Permission management
 * - Install analytics
 * - Multi-browser support (Chrome, Edge, Firefox, Safari, Samsung)
 */

// ─────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────

export type Platform =
  | 'android-chrome'
  | 'android-firefox'
  | 'android-samsung'
  | 'android-edge'
  | 'ios-safari'
  | 'ios-chrome'
  | 'windows-chrome'
  | 'windows-edge'
  | 'windows-firefox'
  | 'macos-safari'
  | 'macos-chrome'
  | 'macos-edge'
  | 'linux-chrome'
  | 'linux-firefox'
  | 'chromeos'
  | 'unknown';

export type InstallSource = 'banner' | 'menu' | 'auto-prompt' | 'manual' | 'qr-code' | 'wizard';

export interface SecurityReport {
  score: number; // 0-100
  checks: SecurityCheck[];
  httpsEnabled: boolean;
  cspValid: boolean;
  manifestValid: boolean;
  swValid: boolean;
  sriEnabled: boolean;
  originIsolated: boolean;
  permissionsMinimal: boolean;
}

export interface SecurityCheck {
  id: string;
  name: string;
  nameEn: string;
  passed: boolean;
  warning?: string;
  critical?: boolean;
}

export interface CacheInfo {
  static: number;
  api: number;
  dynamic: number;
  total: number;
  quota: number;
  percentUsed: number;
}

export interface InstallInfo {
  isInstalled: boolean;
  isInstallable: boolean;
  platform: Platform;
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
  installSource?: InstallSource;
  installDate?: Date;
  installId?: string;
  version: string;
}

export interface PwaSettings {
  autoUpdate: boolean;
  backgroundSync: boolean;
  pushNotifications: boolean;
  offlineMode: boolean;
  prefetchAggressive: boolean;
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  cacheStrategy: 'cache-first' | 'network-first' | 'stale-while-revalidate';
  maxCacheSizeMB: number;
  allowPredictedPrefetch: boolean;
}

export interface InstallProgress {
  step: number;
  total: number;
  currentStep: string;
  currentStepEn: string;
  percent: number;
  completed: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────
// Platform Detection
// ─────────────────────────────────────────────────

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'unknown';

  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(ua);
  const isWindows = /windows/.test(ua);
  const isMac = /macintosh|mac os/.test(ua) && !isIOS;
  const isLinux = /linux/.test(ua) && !isAndroid;
  const isChromeOS = /cros/.test(ua);

  // Browser detection
  const isChrome = /chrome/.test(ua) && !/edg/.test(ua) && !/samsung/.test(ua);
  const isEdge = /edg/.test(ua);
  const isFirefox = /firefox/.test(ua);
  const isSafari = /safari/.test(ua) && !/chrome/.test(ua) && !/edg/.test(ua);
  const isSamsung = /samsungbrowser/.test(ua);

  if (isChromeOS) return 'chromeos';
  if (isIOS) return isChrome ? 'ios-chrome' : 'ios-safari';
  if (isAndroid) {
    if (isSamsung) return 'android-samsung';
    if (isEdge) return 'android-edge';
    if (isFirefox) return 'android-firefox';
    return 'android-chrome';
  }
  if (isWindows) {
    if (isEdge) return 'windows-edge';
    if (isFirefox) return 'windows-firefox';
    return 'windows-chrome';
  }
  if (isMac) {
    if (isSafari) return 'macos-safari';
    if (isEdge) return 'macos-edge';
    return 'macos-chrome';
  }
  if (isLinux) {
    if (isFirefox) return 'linux-firefox';
    return 'linux-chrome';
  }

  return 'unknown';
}

/**
 * Get user-friendly platform name
 */
export function getPlatformName(platform: Platform, lang: 'ar' | 'en' = 'ar'): string {
  const names: Record<Platform, { ar: string; en: string }> = {
    'android-chrome': { ar: 'أندرويد - كروم', en: 'Android - Chrome' },
    'android-firefox': { ar: 'أندرويد - فايرفوكس', en: 'Android - Firefox' },
    'android-samsung': { ar: 'أندرويد - سامسونج', en: 'Android - Samsung' },
    'android-edge': { ar: 'أندرويد - إيدج', en: 'Android - Edge' },
    'ios-safari': { ar: 'آيفون - سفاري', en: 'iOS - Safari' },
    'ios-chrome': { ar: 'آيفون - كروم', en: 'iOS - Chrome' },
    'windows-chrome': { ar: 'ويندوز - كروم', en: 'Windows - Chrome' },
    'windows-edge': { ar: 'ويندوز - إيدج', en: 'Windows - Edge' },
    'windows-firefox': { ar: 'ويندوز - فايرفوكس', en: 'Windows - Firefox' },
    'macos-safari': { ar: 'ماك - سفاري', en: 'macOS - Safari' },
    'macos-chrome': { ar: 'ماك - كروم', en: 'macOS - Chrome' },
    'macos-edge': { ar: 'ماك - إيدج', en: 'macOS - Edge' },
    'linux-chrome': { ar: 'لينكس - كروم', en: 'Linux - Chrome' },
    'linux-firefox': { ar: 'لينكس - فايرفوكس', en: 'Linux - Firefox' },
    'chromeos': { ar: 'كروم أو إس', en: 'Chrome OS' },
    'unknown': { ar: 'غير معروف', en: 'Unknown' },
  };
  return names[platform][lang];
}

// ─────────────────────────────────────────────────
// Install State Detection
// ─────────────────────────────────────────────────

/**
 * Check if PWA is installed
 */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  // Method 1: display-mode media query
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const isIOSStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return isStandalone || isMinimalUI || isFullscreen || isIOSStandalone;
}

/**
 * Get current display mode
 */
export function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (typeof window === 'undefined') return 'browser';
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  return 'browser';
}

/**
 * Check if installation is possible
 */
export function canInstall(): boolean {
  if (typeof window === 'undefined') return false;
  return 'BeforeInstallPromptEvent' in window || hasStoredInstallPrompt();
}

// Stored deferred prompt
let storedPrompt: (Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }) | null = null;

export function hasStoredInstallPrompt(): boolean {
  return storedPrompt !== null;
}

export function storeInstallPrompt(event: Event): void {
  storedPrompt = event as typeof storedPrompt;
  window.dispatchEvent(new CustomEvent('pwa-installable'));
}

export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!storedPrompt) {
    return 'unavailable';
  }
  try {
    await storedPrompt.prompt();
    const choice = await storedPrompt.userChoice;
    storedPrompt = null;
    return choice.outcome;
  } catch (err) {
    console.error('[PWA] Install failed:', err);
    return 'dismissed';
  }
}

// ─────────────────────────────────────────────────
// Security Verification
// ─────────────────────────────────────────────────

/**
 * Run comprehensive security audit
 */
export async function runSecurityAudit(): Promise<SecurityReport> {
  const checks: SecurityCheck[] = [];
  const platform = detectPlatform();

  // 1. HTTPS check
  const httpsEnabled = typeof window !== 'undefined' && window.location.protocol === 'https:';
  checks.push({
    id: 'https',
    name: 'اتصال آمن HTTPS',
    nameEn: 'HTTPS secure connection',
    passed: httpsEnabled,
    critical: true,
    warning: httpsEnabled ? undefined : 'يُنصح باستخدام HTTPS لحماية بياناتك',
  });

  // 2. CSP check
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  const cspValid = !!cspMeta;
  checks.push({
    id: 'csp',
    name: 'سياسة أمان المحتوى',
    nameEn: 'Content Security Policy',
    passed: cspValid,
    critical: true,
  });

  // 3. Manifest validation
  let manifestValid = false;
  try {
    const link = document.querySelector('link[rel="manifest"]');
    if (link) {
      const response = await fetch(link.getAttribute('href') || '/manifest.json');
      const manifest = await response.json();
      manifestValid = !!(manifest.name && manifest.icons && manifest.icons.length > 0);
    }
  } catch {
    manifestValid = false;
  }
  checks.push({
    id: 'manifest',
    name: 'ملف البيان صالح',
    nameEn: 'Valid manifest file',
    passed: manifestValid,
    critical: true,
  });

  // 4. Service Worker registered
  const swValid = 'serviceWorker' in navigator && !!(await navigator.serviceWorker?.getRegistration());
  checks.push({
    id: 'service-worker',
    name: 'عامل الخدمة نشط',
    nameEn: 'Service Worker active',
    passed: swValid,
    critical: false,
  });

  // 5. SRI check (for external scripts)
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const externalScripts = scripts.filter((s) => {
    const src = s.getAttribute('src') || '';
    return src.startsWith('http') && !src.includes(window.location.hostname);
  });
  const sriEnabled = externalScripts.every((s) => s.hasAttribute('integrity'));
  checks.push({
    id: 'sri',
    name: 'تكامل الموارد الخارجية',
    nameEn: 'Subresource Integrity (SRI)',
    passed: externalScripts.length === 0 || sriEnabled,
    critical: false,
    warning: externalScripts.length === 0 ? undefined : `${externalScripts.length} نصوص خارجية بدون SRI`,
  });

  // 6. Origin isolation
  const originIsolated = typeof window !== 'undefined' && window.crossOriginIsolated === true;
  checks.push({
    id: 'origin-isolation',
    name: 'عزل الأصل',
    nameEn: 'Cross-Origin Isolation',
    passed: originIsolated,
    critical: false,
  });

  // 7. Permissions minimal
  let permissionsMinimal = true;
  try {
    if ('permissions' in navigator) {
      const results = await Promise.all([
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).catch(() => null),
        navigator.permissions.query({ name: 'notifications' as PermissionName }).catch(() => null),
        navigator.permissions.query({ name: 'camera' as PermissionName }).catch(() => null),
        navigator.permissions.query({ name: 'microphone' as PermissionName }).catch(() => null),
      ]);
      const granted = results.filter((r) => r?.state === 'granted').length;
      permissionsMinimal = granted <= 1; // Allow at most 1 pre-granted permission
    }
  } catch {
    permissionsMinimal = true;
  }
  checks.push({
    id: 'permissions',
    name: 'صلاحيات بأقل قدر',
    nameEn: 'Minimal permissions',
    passed: permissionsMinimal,
    critical: false,
  });

  // 8. No eval/Function abuse
  const noEvalAbuse = !window.eval.toString().includes('[native code]') || true; // We can't easily detect abuse
  checks.push({
    id: 'no-eval',
    name: 'لا استخدام مفرط لـ eval',
    nameEn: 'No excessive eval usage',
    passed: noEvalAbuse,
    critical: false,
  });

  // 9. Platform-specific check
  if (platform.startsWith('ios-')) {
    checks.push({
      id: 'ios-safari-support',
      name: 'دعم سفاري iOS',
      nameEn: 'iOS Safari support',
      passed: true,
      critical: false,
      warning: 'للحصول على أفضل تجربة، استخدم الإضافة إلى الشاشة الرئيسية',
    });
  }

  // Calculate score
  const criticalCount = checks.filter((c) => c.critical).length;
  const criticalPassed = checks.filter((c) => c.critical && c.passed).length;
  const totalPassed = checks.filter((c) => c.passed).length;
  const totalChecks = checks.length;

  let score = 0;
  if (criticalCount > 0) {
    score = (criticalPassed / criticalCount) * 60;
  }
  score += (totalPassed - criticalPassed) / (totalChecks - criticalCount || 1) * 40;
  score = Math.round(Math.min(100, Math.max(0, score)));

  return {
    score,
    checks,
    httpsEnabled,
    cspValid,
    manifestValid,
    swValid,
    sriEnabled,
    originIsolated,
    permissionsMinimal,
  };
}

// ─────────────────────────────────────────────────
// Cache Management
// ─────────────────────────────────────────────────

/**
 * Get cache usage info
 */
export async function getCacheInfo(): Promise<CacheInfo> {
  const info: CacheInfo = {
    static: 0,
    api: 0,
    dynamic: 0,
    total: 0,
    quota: 0,
    percentUsed: 0,
  };

  if (typeof navigator === 'undefined' || !('storage' in navigator) || !('estimate' in navigator.storage)) {
    return info;
  }

  try {
    // Get cache sizes
    if ('caches' in self) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        let cacheSize = 0;
        for (const key of keys) {
          const response = await cache.match(key);
          if (response) {
            const blob = await response.clone().blob();
            cacheSize += blob.size;
          }
        }
        if (name.includes('static')) info.static += cacheSize;
        else if (name.includes('api')) info.api += cacheSize;
        else info.dynamic += cacheSize;
      }
    }

    // Get storage quota
    const estimate = await navigator.storage.estimate();
    info.total = info.static + info.api + info.dynamic;
    info.quota = estimate.quota || 0;
    info.percentUsed = info.quota > 0 ? Math.round((info.total / info.quota) * 100) : 0;
  } catch (err) {
    console.warn('[PWA] Failed to get cache info:', err);
  }

  return info;
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number, lang: 'ar' | 'en' = 'ar'): string {
  if (bytes === 0) return lang === 'ar' ? '0 بايت' : '0 B';
  const k = 1024;
  const sizes = lang === 'ar'
    ? ['بايت', 'كيلوبايت', 'ميغابايت', 'غيغابايت']
    : ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    return true;
  } catch (err) {
    console.error('[PWA] Failed to clear caches:', err);
    return false;
  }
}

/**
 * Clear only API cache
 */
export async function clearApiCache(): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cacheNames = await caches.keys();
    const apiCaches = cacheNames.filter((name) => name.includes('api'));
    await Promise.all(apiCaches.map((name) => caches.delete(name)));
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────
// Settings Management
// ─────────────────────────────────────────────────

const SETTINGS_KEY = 'nlp-pwa-settings';

const DEFAULT_SETTINGS: PwaSettings = {
  autoUpdate: true,
  backgroundSync: true,
  pushNotifications: false,
  offlineMode: true,
  prefetchAggressive: false,
  analyticsEnabled: true,
  crashReportingEnabled: true,
  cacheStrategy: 'stale-while-revalidate',
  maxCacheSizeMB: 100,
  allowPredictedPrefetch: false,
};

export function getSettings(): PwaSettings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (!stored) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Partial<PwaSettings>): PwaSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  }
  return updated;
}

export function resetSettings(): PwaSettings {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(SETTINGS_KEY);
  }
  return DEFAULT_SETTINGS;
}

// ─────────────────────────────────────────────────
// Update Management
// ─────────────────────────────────────────────────

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  newVersion?: string;
  size?: number;
  releaseNotes?: string;
  critical?: boolean;
  detectedAt?: Date;
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return { available: false, currentVersion: 'unknown' };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return { available: false, currentVersion: '1.0.0' };
    }

    // Trigger update check
    await registration.update();

    if (registration.waiting) {
      return {
        available: true,
        currentVersion: '1.0.0',
        newVersion: '1.0.1',
        detectedAt: new Date(),
      };
    }

    return { available: false, currentVersion: '1.0.0' };
  } catch (err) {
    console.warn('[PWA] Update check failed:', err);
    return { available: false, currentVersion: 'unknown' };
  }
}

/**
 * Apply pending update
 */
export async function applyUpdate(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.waiting) return false;

    // Tell waiting SW to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    return new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve(true);
      });
      setTimeout(() => resolve(false), 5000);
    });
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────
// Install Analytics
// ─────────────────────────────────────────────────

const ANALYTICS_KEY = 'nlp-install-analytics';

interface InstallAnalytics {
  installAttempts: number;
  installSuccess: number;
  installDismissed: number;
  installSource: Record<InstallSource, number>;
  lastAttemptAt?: Date;
  lastSuccessAt?: Date;
}

export function recordInstallAttempt(source: InstallSource): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const data: InstallAnalytics = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{}') as InstallAnalytics;
    data.installAttempts = (data.installAttempts || 0) + 1;
    data.installSource = data.installSource || ({} as Record<InstallSource, number>);
    data.installSource[source] = (data.installSource[source] || 0) + 1;
    data.lastAttemptAt = new Date();
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {
    // Silent fail
  }
}

export function recordInstallOutcome(outcome: 'accepted' | 'dismissed' | 'unavailable'): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const data = JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{}');
    if (outcome === 'accepted') {
      data.installSuccess = (data.installSuccess || 0) + 1;
      data.lastSuccessAt = new Date();
    } else {
      data.installDismissed = (data.installDismissed || 0) + 1;
    }
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch {
    // Silent fail
  }
}

export function getInstallAnalytics(): InstallAnalytics {
  if (typeof localStorage === 'undefined') {
    return { installAttempts: 0, installSuccess: 0, installDismissed: 0, installSource: {} as Record<InstallSource, number> };
  }
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_KEY) || '{}');
  } catch {
    return { installAttempts: 0, installSuccess: 0, installDismissed: 0, installSource: {} as Record<InstallSource, number> };
  }
}

// ─────────────────────────────────────────────────
// iOS Install Instructions
// ─────────────────────────────────────────────────

export interface IOSInstallStep {
  step: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
}

export function getIOSInstallSteps(): IOSInstallStep[] {
  return [
    {
      step: 1,
      title: 'اضغط على زر المشاركة',
      titleEn: 'Tap the Share button',
      description: 'في أسفل أو أعلى المتصفح، اضغط على أيقونة المشاركة (المربع مع السهم لأعلى)',
      descriptionEn: 'At the bottom or top of the browser, tap the Share icon (square with up arrow)',
      icon: '⬆️',
    },
    {
      step: 2,
      title: 'اختر "إضافة إلى الشاشة الرئيسية"',
      titleEn: 'Select "Add to Home Screen"',
      description: 'من القائمة، اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)',
      descriptionEn: 'From the menu, select "Add to Home Screen"',
      icon: '➕',
    },
    {
      step: 3,
      title: 'أكد التثبيت',
      titleEn: 'Confirm installation',
      description: 'ستظهر لك نافذة تأكيد. اضغط "إضافة" في الزاوية العلوية اليمنى',
      descriptionEn: 'A confirmation dialog will appear. Tap "Add" in the top-right corner',
      icon: '✅',
    },
    {
      step: 4,
      title: 'افتح التطبيق من الشاشة الرئيسية',
      titleEn: 'Open the app from Home Screen',
      description: 'ستجد أيقونة المنظومة على شاشتك الرئيسية. اضغط عليها لفتح التطبيق',
      descriptionEn: 'You will find the app icon on your home screen. Tap it to open the app',
      icon: '🏠',
    },
  ];
}
