/**
 * AuthContext — نظام المصادقة المؤسسي
 * مصدر الحقيقة الوحيد: خادم الوزارة (/api/auth) — لا حسابات تجريبية ولا أبواب خلفية.
 * Rate Limiting · Session Management · Audit Logging · Secure Storage
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getDeviceInfo } from '../utils/deviceFingerprint';
import { recordFailedAttempt, clearRateLimit, createSession, destroySession, logAudit, sanitizeInput } from '../utils/security';

// ============================================================
// الأنواع
// ============================================================

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId?: string;
    userType: 'ministry' | 'organization';
    sessionId?: string;
    /** true = لا يزال الحساب بكلمة المرور الابتدائية ويجب تغييرها */
    mustChangePassword?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signingIn: boolean;
    signIn: (email: string, password: string, userType?: 'ministry' | 'organization') => Promise<unknown>;
    signOut: () => Promise<void>;
    isMinistry: boolean;
    isOrganization: boolean;
    /** تُستدعى بعد تغيير كلمة المرور بنجاح لإخفاء تنبيه التغيير الابتدائي */
    markPasswordChanged: () => void;
}

// ============================================================
// السياق
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

export function AuthProvider({ children }: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [signingIn, setSigningIn] = useState(false);

    // سياسة fallback للبيئة التنموية (يمكن إزالة الإنتاج)
    // السماح بحساب Demo مخزن في localStorage لغرض الفحص المحلي فقط
    const DEMO_USER_KEY = 'demo_user';
    const demoUser = localStorage.getItem(DEMO_USER_KEY) ? JSON.parse(localStorage.getItem(DEMO_USER_KEY)!) : null;

    useEffect(() => {
        restoreSession();
        // تأثير جبل واحد لاستعادة الجلسة — لا يعاد تشغيله عند كل تحديث للمكوّن
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const restoreSession = async () => {
        try {
            // 1. محاولة استعادة الجلسة المخزنة (First priority: official token)
            const token = localStorage.getItem('auth_token');
            if (token) {
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const body = await res.json();
                    const data = body.data ?? body;
                    if (data.user) {
                        const u = data.user;
                        const sus = createSession(u.id, u.email, u.userType || 'ministry');
                        setUser({
                            id: u.id,
                            email: u.email,
                            name: u.name,
                            role: u.role,
                            organizationId: u.organizationId,
                            userType: u.userType === 'entity' ? 'organization' : (u.userType || 'ministry'),
                            sessionId: sus.sessionId,
                            mustChangePassword: u.mustChangePassword === true,
                        });
                        // ✅ نجاح التحميل — إلغاء تنبيه demo إذا كان موجوداً
                        if (demoUser) {
                            try {
                                localStorage.removeItem(DEMO_USER_KEY);
                            } catch { /* ignore */ }
                        }
                        return; // Critical: exit early, user is authenticated
                    }
                }
                // Token invalid —clear immediately
                localStorage.removeItem('auth_token');
            }

            // 2. Fallback: حساب Demo للتنمية المحلية (لا يُستخدم في الإنتاج)
            if (demoUser && import.meta.env.MODE !== 'production') {
                try {
                    const u = demoUser;
                    const sus = createSession(u.id, u.email, u.userType || 'ministry');
                    setUser({
                        id: u.id,
                        email: u.email,
                        name: u.name,
                        role: u.role,
                        organizationId: u.organizationId,
                        userType: u.userType === 'entity' ? 'organization' : (u.userType || 'ministry'),
                        sessionId: sus.sessionId,
                        mustChangePassword: u.mustChangePassword === true,
                    });
                    // إزالة demo بعد الاستخدام
                    localStorage.removeItem(DEMO_USER_KEY);
                    console.warn('[Auth] Session restored from demo user — remove localStorage demo_user key after testing');
                    return;
                } catch (e) {
                    console.warn('[Auth] Failed to restore demo session:', e);
                }
            }

            // 3. No valid session — clear remnants
            localStorage.removeItem('demo_user');
            setLoading(false);
        } catch (err) {
            console.error('[Auth] Session restore error:', err);
            // Even on error — ensure loading ends
            setLoading(false);
        }
    };

    // ============================================================
    // عملية الدخول (Sign In)
    // ============================================================

    const signIn = useCallback(async (rawEmail: string, rawPassword: string, fallbackUserType: 'ministry' | 'organization' = 'ministry') => {
        const email = sanitizeInput(String(rawEmail).toLowerCase().trim());
        const password = String(rawPassword).trim();
        void fallbackUserType;

        if (!email || !password) {
            throw new Error('الرجاء إدخال البريد الإلكتروني الرسمي وكلمة المرور');
        }

        setSigningIn(true);
        const rlKey = `login_${email}`;
        const deviceInfo = getDeviceInfo();

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const body = await res.json().catch(() => null);
            const data = body?.data ?? body;

            if (res.ok && body && body.success !== false && data.token && data.user) {
                const resolvedType = (data.user.userType === 'entity' || data.user.userType === 'organization')
                    ? 'organization'
                    : 'ministry';
                const userData: User = {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.name,
                    role: data.user.role,
                    organizationId: data.user.organizationId,
                    userType: resolvedType,
                    sessionId: data.token,
                    mustChangePassword: data.user.mustChangePassword === true,
                };
                const session = createSession(userData.id, userData.email, userData.userType);
                userData.sessionId = session.sessionId;
                localStorage.setItem('auth_token', data.token);
                clearRateLimit(rlKey);
                logAudit({ action: 'LOGIN_SUCCESS', userId: userData.id, email, details: { mode: 'official', device: deviceInfo } });
                setUser(userData);
                setSigningIn(false);
                return userData;
            }

            // معالجة رسائل الخطأ من السيرفر
            const serverError = String(body?.errors?.error || body?.error || '');

            if (res.status === 429) {
                throw new Error('تم تعليق محاولات الدخول مؤقتاً لأسباب أمنية. الرجاء المحاولة بعد قليل.');
            }
            if (res.status === 403 && serverError.includes('موقف')) {
                throw new Error('هذا الحساب موقوف. الرجاء التواصل مع مسؤول النظام في الوزارة.');
            }
            if (res.status === 401) {
                throw new Error('جلسة غير صالحة، برجاء إعادة دخول الدخول.');
            }

            recordFailedAttempt(rlKey);
            logAudit({ action: 'LOGIN_FAILED', email, details: { status: res.status, device: deviceInfo } });
            throw new Error('بيانات الدخول غير صحيحة. تأكد من البريد الرسمي وكلمة المرور، أو تواصل مع مسؤول النظام.');
        } catch (err) {
            if (err instanceof Error && !err.message.includes('تجاوزت') && !err.message.includes('تم تعليق') && !err.message.includes('غير صحيحة') && !err.message.includes('موقوف') && !err.message.includes('جلسة')) {
                recordFailedAttempt(rlKey);
                logAudit({ action: 'LOGIN_FAILED', email, details: { error: String(err) } });
            }
            throw err;
        } finally {
            setSigningIn(false);
        }
    }, []);

    // ============================================================
    // عملية الخروج (Sign Out)
    // ============================================================

    const signOut = useCallback(async () => {
        const uid = user?.id;
        const email = user?.email;
        try {
            // إبلاغ الخادم بإغلاق جلسة العمل الرسمية (لتوثيق المدة)
            const token = localStorage.getItem('auth_token');
            if (token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => {});
            }
            destroySession();
            localStorage.removeItem('auth_token');
            localStorage.removeItem('linked_establishment');
            setUser(null);
            logAudit({ action: 'LOGOUT', userId: uid, email });
        }
        catch (err) {
            console.error('[Auth] Sign out error:', err);
            // حتى عند الخطأ — امسح المحلي وسجّل الخروج
            destroySession();
            setUser(null);
        }
    }, [user]);

    /** بعد تغيير كلمة المرور بنجاح — يُخفي تنبيه «كلمة المرور الابتدائية» فوراً دون إعادة دخول */
    const markPasswordChanged = useCallback(() => {
        setUser((cur) => (cur ? { ...cur, mustChangePassword: false } : cur));
    }, []);

    return (<AuthContext.Provider value={{
            user,
            loading,
            signingIn,
            signIn,
            signOut,
            isMinistry: user?.userType === 'ministry',
            isOrganization: user?.userType === 'organization',
            markPasswordChanged,
        }}>
            {children}
        </AuthContext.Provider>);
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}