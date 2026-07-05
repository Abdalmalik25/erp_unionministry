/**
 * Keyboard Shortcuts Hook - اختصارات لوحة المفاتيح
 * للتنقل السريع والعمليات المتكررة
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
        const matchesAlt = shortcut.alt === undefined || event.altKey === shortcut.alt;
        const matchesShift = shortcut.shift === undefined || event.shiftKey === shortcut.shift;

        if (matchesKey && matchesCtrl && matchesAlt && matchesShift) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts, enabled]);
}

// Hook جاهز للاختصارات الشائعة
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  const shortcuts: ShortcutConfig[] = [
    // التنقل
    {
      key: 'h',
      ctrl: true,
      action: () => navigate('/ministry'),
      description: 'الذهاب إلى الصفحة الرئيسية',
    },
    {
      key: 'u',
      ctrl: true,
      action: () => navigate('/ministry/unions'),
      description: 'النقابات',
    },
    {
      key: 'm',
      ctrl: true,
      action: () => navigate('/ministry/members'),
      description: 'الأعضاء',
    },
    {
      key: 's',
      ctrl: true,
      action: () => navigate('/ministry/services'),
      description: 'الخدمات',
    },

    // البحث
    {
      key: '/',
      ctrl: true,
      action: () => {
        const searchInput = document.querySelector<HTMLInputElement>('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'التركيز على البحث',
    },

    // الإجراءات
    {
      key: 'k',
      ctrl: true,
      action: () => {
        // فتح لوحة الأوامر
        const event = new CustomEvent('openCommandPalette');
        window.dispatchEvent(event);
      },
      description: 'فتح لوحة الأوامر',
    },

    // المساعدة
    {
      key: '?',
      shift: true,
      action: () => {
        const event = new CustomEvent('showKeyboardShortcuts');
        window.dispatchEvent(event);
      },
      description: 'عرض الاختصارات',
      preventDefault: false,
    },
  ];

  useKeyboardShortcuts(shortcuts);
}

// Component لعرض الاختصارات
export function KeyboardShortcutsHelper({ shortcuts }: { shortcuts: ShortcutConfig[] }) {
  return (
    <div className="space-y-4" dir="rtl">
      <h3 className="text-lg font-bold text-gray-800 mb-4">اختصارات لوحة المفاتيح</h3>

      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm text-gray-700">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.ctrl && (
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700">
                  Ctrl
                </kbd>
              )}
              {shortcut.alt && (
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700">
                  Alt
                </kbd>
              )}
              {shortcut.shift && (
                <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700">
                  Shift
                </kbd>
              )}
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold text-gray-700">
                {shortcut.key.toUpperCase()}
              </kbd>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 نصيحة: استخدم <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs">Shift</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded text-xs">?</kbd> لعرض هذه القائمة في أي وقت
        </p>
      </div>
    </div>
  );
}
