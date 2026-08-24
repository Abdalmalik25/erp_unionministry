/**
 * Device Fingerprint - بصمة الجهاز للمصادقة الأمنية
 * الأمان الحكومي — وزارة الشؤون الاجتماعية والعمل
 */
// ============================================
// أنواع البيانات
// ============================================
export interface DeviceFingerprint {
    id: string;
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    timezone: string;
    cookiesEnabled: boolean;
    canvasFingerprint: string;
    webglFingerprint: string;
    deviceMemory?: number;
    hardwareConcurrency?: number;
    createdAt: number;
}
export interface FingerprintValidation {
    isValid: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reasons: string[];
}
// ============================================
// إنشاء بصمة الجهاز
// ============================================
export function generateDeviceFingerprint(): DeviceFingerprint {
    const fp: DeviceFingerprint = {
        id: generateFingerprintId(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookiesEnabled: navigator.cookieEnabled,
        canvasFingerprint: getCanvasFingerprint(),
        webglFingerprint: getWebGLFingerprint(),
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
        createdAt: Date.now(),
    };
    return fp;
}
function generateFingerprintId(): string {
    const components = [
        navigator.userAgent,
        navigator.language,
        navigator.platform,
        screen.width,
        screen.height,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
        navigator.cookieEnabled ? '1' : '0',
    ];
    let hash = 0;
    for (const component of components) {
        const str = String(component);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
    }
    return Math.abs(hash).toString(36);
}
// ============================================
// Canvas Fingerprint
// ============================================
function getCanvasFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return '';
        // رسم نص مع تأثيرات
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('MOSAL Security Test 🎯', 2, 2);
        ctx.fillStyle = '#1E3A8A';
        ctx.fillRect(0, 0, 10, 10);
        ctx.strokeStyle = 'rgba(100, 0, 0, 0.5)';
        ctx.moveTo(0, 0);
        ctx.lineTo(100, 100);
        ctx.stroke();
        return canvas.toDataURL();
    }
    catch {
        // Canvas fingerprint not available
        return '';
    }
}
// ============================================
// WebGL Fingerprint
// ============================================
function getWebGLFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
        if (!gl)
            return '';
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL);
            const vendor = gl.getParameter((debugInfo as any).UNMASKED_VENDOR_WEBGL);
            return `${renderer}|${vendor}`;
        }
        return gl.getParameter(gl.RENDERER) as string;
    }
    catch {
        // WebGL fingerprint not available
        return '';
    }
}
// ============================================
// التخزين المحلي
// ============================================
const STORAGE_KEY = 'device_fingerprint';
export function storeDeviceFingerprint(fp: DeviceFingerprint): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fp));
}
export function getStoredDeviceFingerprint(): DeviceFingerprint | null {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    }
    catch {
        // Failed to read stored fingerprint
        return null;
    }
}
export function removeDeviceFingerprint(): void {
    localStorage.removeItem(STORAGE_KEY);
}
// ============================================
// التحقق من بصمة الجهاز
// ============================================
export function validateDeviceFingerprint(current: DeviceFingerprint): FingerprintValidation {
    const stored = getStoredDeviceFingerprint();
    if (!stored) {
        return {
            isValid: true,
            riskLevel: 'low',
            reasons: ['أول طلب من هذا الجهاز'],
        };
    }
    const reasons: string[] = [];
    // التحقق من التغييرات الحرجة
    if (stored.userAgent !== current.userAgent) {
        reasons.push('تغيير User Agent');
    }
    if (stored.platform !== current.platform) {
        reasons.push('تغيير المنصة');
    }
    if (stored.screenResolution !== current.screenResolution) {
        reasons.push('تغيير دقة الشاشة');
    }
    // تحديد مستوى المخاطر
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (reasons.length >= 2) {
        riskLevel = 'high';
    }
    else if (reasons.length === 1) {
        riskLevel = 'medium';
    }
    return {
        isValid: riskLevel !== 'high',
        riskLevel,
        reasons,
    };
}
// ============================================
// دمج مع نظام المصادقة
// ============================================
export async function checkDeviceSecurity(): Promise<{
    fingerprint: DeviceFingerprint;
    validation: FingerprintValidation;
}> {
    const current = generateDeviceFingerprint();
    const validation = validateDeviceFingerprint(current);
    // تخزين البصمة الحالية
    storeDeviceFingerprint(current);
    return {
        fingerprint: current,
        validation,
    };
}
// ============================================
// Hook للـ React (للاستخدام في المكونات)
// ============================================
export function useDeviceFingerprint(): {
    fingerprint: DeviceFingerprint | null;
    updateFingerprint: () => void;
} {
    const getFingerprint = (): DeviceFingerprint | null => {
        if (typeof window === 'undefined')
            return null;
        return getStoredDeviceFingerprint() || generateDeviceFingerprint();
    };
    const updateFingerprint = (): void => {
        const fp = generateDeviceFingerprint();
        storeDeviceFingerprint(fp);
        // إرسال حدث لتحديث المكونات
        window.dispatchEvent(new CustomEvent('device-fingerprint-updated', { detail: fp }));
    };
    return {
        fingerprint: getFingerprint(),
        updateFingerprint,
    };
}
// ============================================
// إرسال بصمة الجهاز مع الطلبات
// ============================================
export function getFingerprintHeader(): Record<string, string> {
    const fp = getStoredDeviceFingerprint() || generateDeviceFingerprint();
    return {
        'X-Device-Fingerprint': fp.id,
        'X-Device-Platform': fp.platform,
    };
}
export function attachFingerprintToRequest(headers: Record<string, string>): Record<string, string> {
    return {
        ...headers,
        ...getFingerprintHeader(),
    };
}
// ============================================
// دالة getDeviceInfo - للاستخدام في AuthContext
// ============================================
export function getDeviceInfo(): Record<string, any> {
    if (typeof window === 'undefined')
        return {};
    const fp = generateDeviceFingerprint();
    return {
        userAgent: fp.userAgent,
        platform: fp.platform,
        language: fp.language,
        screenResolution: fp.screenResolution,
        timezone: fp.timezone,
        cookiesEnabled: fp.cookiesEnabled,
        deviceMemory: fp.deviceMemory,
        hardwareConcurrency: fp.hardwareConcurrency,
        deviceId: fp.id,
    };
}
