/**
 * globalErrorGuards.test.ts — اختبارات حرس الأخطاء العام (Non-Fatal Media)
 */
import { describe, it, expect } from 'vitest';
import { isBenignMediaError } from './globalErrorGuards';

describe('isBenignMediaError', () => {
  it('classifies NotSupportedError (audio.play failure) as benign', () => {
    const err = new DOMException(
      'Failed to load because no supported source was found.',
      'NotSupportedError',
    );
    expect(isBenignMediaError(err)).toBe(true);
  });

  it('classifies error with NotSupportedError name only as benign', () => {
    expect(isBenignMediaError({ name: 'NotSupportedError' })).toBe(true);
  });

  it('classifies AbortError (play interrupted) as benign', () => {
    const err = new DOMException('The play() request was interrupted.', 'AbortError');
    expect(isBenignMediaError(err)).toBe(true);
  });

  it('classifies NotAllowedError (autoplay blocked) as benign', () => {
    expect(isBenignMediaError({ name: 'NotAllowedError' })).toBe(true);
  });

  it('classifies MediaError code 1-4 objects as benign', () => {
    expect(isBenignMediaError({ code: 4 })).toBe(true);
    expect(isBenignMediaError({ code: 1 })).toBe(true);
  });

  it('classifies plain message strings about unsupported sources as benign', () => {
    expect(isBenignMediaError('no supported source was found')).toBe(true);
  });

  it('does NOT classify real application errors as benign', () => {
    expect(isBenignMediaError(new TypeError('Cannot read properties of undefined'))).toBe(false);
    expect(isBenignMediaError(new Error('Network request failed'))).toBe(false);
    expect(isBenignMediaError('boom')).toBe(false);
  });

  it('does NOT classify MediaError-like codes outside 1-4', () => {
    expect(isBenignMediaError({ code: 0 })).toBe(false);
    expect(isBenignMediaError({ code: 5 })).toBe(false);
    expect(isBenignMediaError({ code: '4' })).toBe(false);
  });

  it('handles null/undefined/empty safely', () => {
    expect(isBenignMediaError(null)).toBe(false);
    expect(isBenignMediaError(undefined)).toBe(false);
    expect(isBenignMediaError('')).toBe(false);
  });
});
