/**
 * AuthContext — نظام المصادقة الآمن
 * Rate Limiting · Session Management · Audit Logging · Secure Storage
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from '../../../utils/supabase/info';
import { getDeviceInfo } from '../utils/deviceFingerprint';
import { initDemoData } from '../utils/demoData';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  createSession,
  getSession,
  destroySession,
  logAudit,
  sanitizeInput,
} from '../utils/security';

// إنشاء Supabase Client مع التعامل مع البيئات اللي لا تملك URL
const supabase = supabaseUrl ? createClient(supabaseUrl, publicAnonKey) : null;

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
  signIn: (email: string, password: string, userType: 'ministry' | 'organization') => Promise<void>;
  signOut: () => Promise<void>;
  isMinistry: boolean;
  isOrganization: boolean;
}

const AuthContext = createContext(undefined);

// ============================================================
// بيانات Demo (لا تُعرض في الواجهة)
// ============================================================

const DEMO_CREDENTIALS = [
  {
    email: 'ministry@yemen.gov.ye',
    // Hash مبسّط للمقارنة (في الإنتاج: bcrypt على السيرفر)
    passwordHash: btoa('Ministry@2026'),
    id: 'demo-ministry-001',
    name: 'محمد أحمد الوزير',
    role: 'ministry_admin',
    userType: 'ministry' as const,
  },
  {
    email: 'engineers@union.ye',
    passwordHash: btoa('Engineers@2026'),
    id: 'demo-union-001',
    name: 'علي حسن المهندس',
    role: 'union_president',
    organizationId: 'YE-2024-001',
    userType: 'organization' as const,
  },
];

// ============================================================
// Provider
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      // 1. استعادة جلسة Demo من localStorage
      const demoRaw = localStorage.getItem('demo_user');
      if (demoRaw) {
        const session = getSession();
        if (session) {
          const demoUser: User = JSON.parse(demoRaw);
          setUser({ ...demoUser, sessionId: session.sessionId });
          setLoading(false);
          return;
        } else {
          // الجلسة منتهية — مسح
          localStorage.removeItem('demo_user');
        }
      }

      // 2. استعادة جلسة Supabase (إذا كان متاحاً)
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const meta = session.user.user_metadata;
          const sus = createSession(session.user.id, session.user.email || '', meta.userType || 'ministry');
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: meta.name || '',
            role: meta.role || '',
            organizationId: meta.organizationId,
            userType: meta.userType || 'ministry',
            sessionId: sus.sessionId,
          });
        }
      }
    } catch (err) {
      console.error('[Auth] Session restore error:', err);
    } finally {
      setLoading(false);
    }
  };

  const signIn = useCallback(async (
    rawEmail: string,
    rawPassword: string,
    userType: 'ministry' | 'organization'
  ) => {
    const email = sanitizeInput(rawEmail.toLowerCase().trim());
    const rlKey = `login_${email}`;

    // فحص Rate Limit
    const rl = checkRateLimit(rlKey);
    if (!rl.allowed) {
      logAudit({ action: 'RATE_LIMITED', email, details: { lockedUntil: rl.lockedUntil } });
      throw new Error(rl.message || 'تجاوزت الحد المسموح من المحاولات. الرجاء الانتظار.');
    }

    const deviceInfo = getDeviceInfo();

    try {
      // محاولة Demo Mode
      const demoMatch = DEMO_CREDENTIALS.find(
        u => u.email === email && btoa(rawPassword) === u.passwordHash
      );

      if (demoMatch) {
        initDemoData();
        const session = createSession(demoMatch.id, demoMatch.email, demoMatch.userType);
        const userData: User = {
          id: demoMatch.id,
          email: demoMatch.email,
          name: demoMatch.name,
          role: demoMatch.role,
          organizationId: demoMatch.organizationId,
          userType: demoMatch.userType,
          sessionId: session.sessionId,
        };

        localStorage.setItem('demo_user', JSON.stringify(userData));
        setUser(userData);
        clearRateLimit(rlKey);
        logAudit({ action: 'LOGIN_SUCCESS', userId: userData.id, email, details: { mode: 'demo', device: deviceInfo } });
        return;
      }

      // محاولة Supabase (إذا كان متاحاً)
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: rawPassword });

        if (error) {
          const result = recordFailedAttempt(rlKey);
          logAudit({ action: 'LOGIN_FAILED', email, details: { remaining: result.remainingAttempts, device: deviceInfo } });

          if (result.locked) {
            logAudit({ action: 'ACCOUNT_LOCKED', email, details: { until: result.lockedUntil } });
            throw new Error('تم تعليق حسابك مؤقتاً لمدة 30 دقيقة بسبب كثرة محاولات الدخول الفاشلة.');
          }

          const remaining = result.remainingAttempts;
          throw new Error(
            remaining > 0
              ? `البريد الإلكتروني أو كلمة المرور غير صحيحة. تبقّى ${remaining} محاولة.`
              : 'بيانات الدخول غير صحيحة.'
          );
        }

        if (data.user) {
          const meta = data.user.user_metadata;
          const session = createSession(data.user.id, data.user.email || '', userType);
          clearRateLimit(rlKey);

          const userData: User = {
            id: data.user.id,
            email: data.user.email || '',
            name: meta.name || 'مستخدم',
            role: meta.role || '',
            organizationId: meta.organizationId,
            userType: meta.userType || userType,
            sessionId: session.sessionId,
          };
          setUser(userData);
          logAudit({ action: 'LOGIN_SUCCESS', userId: userData.id, email, details: { mode: 'supabase', device: deviceInfo } });
        }
      } else {
        // إذا لم يكن Supabase متاحاً، استخدم Demo Mode فقط
        throw new Error('نموذج الموقّع غير مُعد. استخدم حسابات Demo.');
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes('تجاوزت') && !err.message.includes('تم تعليق') && !err.message.includes('غير صحيحة') && !err.message.includes('نموذج الموقّع')) {
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
      destroySession();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      logAudit({ action: 'LOGOUT', userId: uid, email });
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
      // حتى عند الخطأ — امسح المحلي وسجّل الخروج
      destroySession();
      setUser(null);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signOut,
      isMinistry: user?.userType === 'ministry',
      isOrganization: user?.userType === 'organization',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}