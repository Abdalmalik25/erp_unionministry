/**
 * اختبارات المحتوى المؤسسي المشترك — ضبط الجودة الرسمية للنصوص
 */
import { describe, it, expect } from 'vitest';
import { NATIONAL_REGISTRIES, LEGAL_ITEMS, FAQ_ITEMS, NATIONAL_PANELS } from './institutional';

describe('المحتوى المؤسسي المشترك', () => {
  it('السجلات الوطنية عشرة سجلات كاملة النصوص', () => {
    expect(NATIONAL_REGISTRIES).toHaveLength(10);
    expect(NATIONAL_REGISTRIES.every(([t, b]) => t.length > 2 && b.length > 40)).toBe(true);
  });

  it('لا تكرار في أسماء السجلات أو الأسئلة', () => {
    const names = NATIONAL_REGISTRIES.map(([t]) => t);
    expect(new Set(names).size).toBe(names.length);
    const questions = FAQ_ITEMS.map(([q]) => q);
    expect(new Set(questions).size).toBe(questions.length);
  });

  it('الأساس القانوني يشمل اليمننة بالنسبة المعتمدة 80%', () => {
    const yemenization = LEGAL_ITEMS.find(([t]) => t.includes('اليمننة'));
    expect(yemenization).toBeDefined();
    expect(yemenization![1]).toContain('80%');
  });

  it('كل نص نظامي يُستشهد به في الأسئلة له مدخل في المرجع القانوني', () => {
    const legalTitles = LEGAL_ITEMS.map(([t]) => t).join('|');
    const faqBodies = FAQ_ITEMS.map(([, b]) => b).join(' ');
    if (faqBodies.includes('لائحة حوادث العمل')) {
      expect(legalTitles).toContain('حوادث وإصابات العمل');
    }
    if (faqBodies.includes('نسبة التعيين الوطني')) {
      expect(legalTitles).toContain('اليمننة');
    }
  });

  it('الأسئلة الشائعة تغطي المواضيع الحرجة', () => {
    const topics = FAQ_ITEMS.map(([q]) => q).join('|');
    for (const key of ['سجل التدقيق', 'انقطع الإنترنت', 'بيانات الأشخاص', 'الحسابات', 'حادث العمل', 'العمالة الوافدة']) {
      expect(topics).toContain(key);
    }
  });

  it('كل الإجابات مؤسسية الصياغة (بلا مصطلحات تقنية مجردة)', () => {
    const all = [...LEGAL_ITEMS, ...FAQ_ITEMS].map(([, b]) => b).join(' ');
    // لا يجوز ذكر أسماء تقنيات بلا سياق تعريفي
    expect(all).not.toMatch(/API|database schema|backend/i);
  });

  it('المؤشرات الوطنية ست لوحات استراتيجية مكتملة', () => {
    expect(NATIONAL_PANELS).toHaveLength(6);
    expect(NATIONAL_PANELS.every(p => p.value.length > 0 && p.label.length > 3 && p.message.length > 30)).toBe(true);
    expect(new Set(NATIONAL_PANELS.map(p => p.label)).size).toBe(6);
    const joined = NATIONAL_PANELS.map(p => `${p.label} ${p.message}`).join(' ');
    for (const key of ['قانون العمل', 'سجلات', 'التعيين الوطني', 'الحوكمة']) {
      expect(joined).toContain(key);
    }
  });
});
