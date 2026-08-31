// src/app/components/a11y/A11yAnnouncer.tsx
// يبث رسائل عاجلة لقارئات الشاشة (ARIA live regions)

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';

interface Announcement {
  id: number;
  text: string;
  politeness: 'polite' | 'assertive';
}

let counter = 0;
const listeners = new Set<(msg: Announcement) => void>();

/** بث رسالة لقارئات الشاشة من أي مكان */
export function announce(text: string, politeness: 'polite' | 'assertive' = 'polite'): void {
  if (typeof window === 'undefined') return;
  const message: Announcement = { id: ++counter, text, politeness };
  listeners.forEach((cb) => cb(message));
}

export function A11yAnnouncer() {
  const [politeMsg, setPoliteMsg] = useState('');
  const [assertiveMsg, setAssertiveMsg] = useState('');
  const location = useLocation();

  useEffect(() => {
    const handler = (msg: Announcement) => {
      if (msg.politeness === 'assertive') {
        setAssertiveMsg(msg.text);
        setTimeout(() => setAssertiveMsg(''), 4000);
      } else {
        setPoliteMsg(msg.text);
        setTimeout(() => setPoliteMsg(''), 4000);
      }
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  // عند التنقل بين الصفحات، يبلّغ قارئ الشاشة بتغيّر المسار
  useEffect(() => {
    const path = location.pathname;
    const title = typeof document !== 'undefined' ? document.title : path;
    announce(`انتقلت إلى: ${title}`, 'polite');
  }, [location.pathname]);

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}
      >
        {politeMsg}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', borderWidth: 0 }}
      >
        {assertiveMsg}
      </div>
    </>
  );
}
