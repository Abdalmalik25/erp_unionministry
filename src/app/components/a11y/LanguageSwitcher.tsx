// src/app/components/a11y/LanguageSwitcher.tsx
// مفاتيح تبديل اللغة مع أيقونات WAV/SVG متوافقة مع لوحة المفاتيح

import { Globe } from 'lucide-react';
import { useLanguage, type Language } from '../../contexts/LanguageContext';

export function LanguageSwitcher() {
  const { current, switchLanguage, supported } = useLanguage();

  return (
    <div className="flex items-center gap-1" role="group" aria-label="تبديل اللغة">
      {supported.map((lng: Language) => (
        <button
          key={lng}
          type="button"
          onClick={() => void switchLanguage(lng)}
          aria-pressed={current === lng}
          aria-label={lng === 'ar' ? 'العربية' : 'English'}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold
            transition-all duration-150 cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ring
            ${current === lng
              ? 'bg-primary text-white shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }
          `}
        >
          <Globe size={13} aria-hidden />
          <span>{lng === 'ar' ? 'عربي' : 'EN'}</span>
        </button>
      ))}
    </div>
  );
}
