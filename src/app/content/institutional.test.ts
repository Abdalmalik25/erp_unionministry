/**
 * اختبارات المحتوى المؤسسي المشترك — ضبط الجودة الرسمية للنصوص
 */
import { describe, it, expect } from 'vitest';
import { NATIONAL_REGISTRIES, LEGAL_ITEMS, FAQ_ITEMS } from './institutional';

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

  it('الأسئلة الشائعة تغطي المواضيع الحرجة', () => {
    const topics = FAQ_ITEMS.map(([q]) => q).join('|');
    for (const key of ['سجل التدقيق', 'انقطع الإنترنت', 'بيانات الأشخاص', 'الحسابات']) {
      expect(topics).toContain(key);
    }
  });

  it('كل الإجابات مؤسسية الصياغة (بلا مصطلحات تقنية مجردة)', () => {
    const all = [...LEGAL_ITEMS, ...FAQ_ITEMS].map(([, b]) => b).join(' ');
    // لا يجوز ذكر أسماء تقنيات بلا سياق تعريفي
    expect(all).not.toMatch(/API|database schema|backend/i);
  });
});
