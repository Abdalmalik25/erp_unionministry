/**
 * useSessionTimeout — إدارة انتهاء صلاحية الجلسة
 * يراقب نشاط المستخدم ويُحذّر قبل انتهاء الجلسة
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { refreshSession, isSessionExpired, isSessionWarning, getSessionTimeRemaining, logAudit } from '../utils/security';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'pointermove'];
const CHECK_INTERVAL_MS = 30_000; // فحص كل 30 ثانية

interface SessionStatus {
  isWarning: boolean;
  isExpired: boolean;
  remainingSeconds: number;
}

export function useSessionTimeout(onExpire: () => void): SessionStatus {
  const [status, setStatus] = useState<SessionStatus>({
    isWarning: false,
    isExpired: false,
    remainingSeconds: 0,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef(Date.now());

  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    // تجديد الجلسة عند النشاط — فقط إذا لم تكن منتهية
    if (!isSessionExpired()) {
      refreshSession();
    }
  }, []);

  const checkSession = useCallback(() => {
    const expired = isSessionExpired();
    const warning = isSessionWarning();
    const remaining = Math.ceil(getSessionTimeRemaining() / 1000);

    setStatus({ isWarning: warning, isExpired: expired, remainingSeconds: remaining });

    if (expired) {
      logAudit({ action: 'SESSION_EXPIRED', details: { reason: 'timeout' } });
      if (intervalRef.current) clearInterval(intervalRef.current);
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, handleActivity));
      onExpire();
    }
  }, [onExpire, handleActivity]);

  useEffect(() => {
    // ربط أحداث النشاط
    ACTIVITY_EVENTS.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));

    // جدولة الفحص الدوري
    intervalRef.current = setInterval(checkSession, CHECK_INTERVAL_MS);
    checkSession(); // فحص فوري

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      ACTIVITY_EVENTS.forEach(e => document.removeEventListener(e, handleActivity));
    };
  }, [checkSession, handleActivity]);

  return status;
}
