import { describe, it, expect } from 'vitest';
import { extractList, unwrapApi } from './api';

describe('extractList — يمنع أعطال ‎.filter is not a function', () => {
  it('يفك الظرف الموحد {success,data:{data:[...],total}} — حالة العطل الفعلية', () => {
    const body = {
      success: true,
      data: { data: [{ id: 1 }, { id: 2 }], total: 2, page: 1, limit: 20 },
      meta: { timestamp: 'x' },
      errors: null,
    };
    const list = extractList(body);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(2);
  });

  it('يتعامل مع الشكل القديم {data:[...]} مباشرة', () => {
    expect(extractList({ data: [{ a: 1 }] })).toEqual([{ a: 1 }]);
  });

  it('يقبل مصفوفة خام كما هي', () => {
    expect(extractList([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('يدعم المفاتيح المسماة (requests/members/entities)', () => {
    expect(extractList({ data: { requests: [{ id: 9 }] } }, ['requests'])).toHaveLength(1);
    expect(extractList({ data: { members: [] } }, ['members'])).toEqual([]);
    expect(extractList({ entities: [{ id: 5 }] }, ['entities'])).toHaveLength(1);
  });

  it('يعيد [] آمناً للقيم الغريبة بدل الأعطال', () => {
    expect(extractList(null)).toEqual([]);
    expect(extractList(undefined)).toEqual([]);
    expect(extractList('نص')).toEqual([]);
    expect(extractList(42)).toEqual([]);
    expect(extractList({})).toEqual([]);
    // الكائن بدون مصفوفة داخلية يجب ألا يُعاد كـ"قائمة"
    const dangerous = extractList({ data: { data: { nested: 'object' } } });
    expect(Array.isArray(dangerous)).toBe(true);
    expect(dangerous).toEqual([]);
  });

  it('unwrapApi يميز بين الظرف والمصفوفة الخام', () => {
    expect(unwrapApi([1])).toEqual([1]);
    const env = unwrapApi({ success: true, data: { x: 1 } });
    expect(env).toHaveProperty('data');
  });

  it('سيناريو الصفحات: نتيجة الخادم الحقيقية للمسار /api/members', () => {
    const realResponse = {
      success: true,
      data: {
        data: [
          { member_id: 'a', full_name: 'عضو أول', specialization: null },
          { member_id: 'b', full_name: 'عضو ثانٍ', specialization: 'محاسبة' },
        ],
        total: 2, page: 1, limit: 20,
      },
      meta: { timestamp: '2026-08-24T12:00:00Z', path: '/api/members', method: 'GET' },
      errors: null,
    };
    const members = extractList(realResponse);
    expect(() => members.filter((m) => m.full_name.includes('عضو'))).not.toThrow();
    expect(members.filter((m) => m.specialization).length).toBe(1);
  });
});
