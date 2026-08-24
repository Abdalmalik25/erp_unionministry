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
}
interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string, userType?: 'ministry' | 'organization') => Promise<unknown>;
    signOut: () => Promise<void>;
    isMinistry: boolean;
    isOrganization: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================
export function AuthProvider({ children }: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        restoreSession();
    }, []);

    const restoreSession = async () => {
        try {
            // استعادة الجلسة الرسمية عبر الرمز المميز الصادر من الخادم
            const token = localStorage.getItem('auth_token');
            if (token) {
                const res = await fetch('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
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
                        });
                        return;
                    }
                }
                // رمز غير صالح — يُمسح فوراً
                localStorage.removeItem('auth_token');
            }
            // تنظيف أي مخلفات جلسات قديمة غير رسمية
            localStorage.removeItem('demo_user');
        }
        catch (err) {
            console.error('[Auth] Session restore error:', err);
        }
        finally {
            setLoading(false);
        }
    };

    const signIn = useCallback(async (rawEmail: string, rawPassword: string, _fallbackUserType: 'ministry' | 'organization' = 'ministry') => {
        const email = sanitizeInput(String(rawEmail).toLowerCase().trim());
        const password = String(rawPassword).trim();

        if (!email || !password) {
            throw new Error('الرجاء إدخال البريد الإلكتروني الرسمي وكلمة المرور');
        }

        const rlKey = `login_${email}`;
        const deviceInfo = getDeviceInfo();
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success && data.token && data.user) {
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
                    };
                    const session = createSession(userData.id, userData.email, userData.userType);
                    userData.sessionId = session.sessionId;
                    localStorage.setItem('auth_token', data.token);
                    clearRateLimit(rlKey);
                    logAudit({ action: 'LOGIN_SUCCESS', userId: userData.id, email, details: { mode: 'official', device: deviceInfo } });
                    setUser(userData);
                    return userData;
                }
            }

            // رسائل خطأ مؤسسية موحدة دون كشف تفاصيل النظام
            let serverError = '';
            try {
                const errBody = await res.json();
                serverError = errBody?.errors?.error || errBody?.error || '';
            }
            catch { /* تجاهل */ }

            if (res.status === 429) {
                throw new Error('تم تعليق محاولات الدخول مؤقتاً لأسباب أمنية. الرجاء المحاولة بعد قليل.');
            }
            if (res.status === 403 && serverError.includes('موقف')) {
                throw new Error('هذا الحساب موقوف. الرجاء التواصل مع مسؤول النظام في الوزارة.');
            }
            recordFailedAttempt(rlKey);
            logAudit({ action: 'LOGIN_FAILED', email, details: { status: res.status, device: deviceInfo } });
            throw new Error('بيانات الدخول غير صحيحة. تأكد من البريد الرسمي وكلمة المرور، أو تواصل مع مسؤول النظام.');
        }
        catch (err) {
            if (err instanceof Error && !err.message.includes('تجاوزت') && !err.message.includes('تم تعليق') && !err.message.includes('غير صحيحة') && !err.message.includes('موقوف')) {
                recordFailedAttempt(rlKey);
                logAudit({ action: 'LOGIN_FAILED', email, details: { error: String(err) } });
            }
            throw err;
        }
    }, []);

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

    return (<AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signOut,
            isMinistry: user?.userType === 'ministry',
            isOrganization: user?.userType === 'organization',
        }}>
            {children}
        </AuthContext.Provider>);
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
