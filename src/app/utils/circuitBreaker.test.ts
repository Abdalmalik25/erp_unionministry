/**
 * circuitBreaker.test.ts — اختبارات شاملة لـ Circuit Breaker
 */
import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError, circuits } from './circuitBreaker';

describe('CircuitBreaker', () => {
  describe('state transitions', () => {
    it('should start in CLOSED state', () => {
      const cb = new CircuitBreaker({ name: 'test', failureThreshold: 3, resetTimeout: 100 });
      expect(cb.state).toBe('CLOSED');
      expect(cb.isClosed).toBe(true);
    });

    it('should open after threshold failures', async () => {
      const cb = new CircuitBreaker({ name: 'test', failureThreshold: 2, resetTimeout: 100 });
      const failing = vi.fn().mockRejectedValue(new Error('fail'));
      await expect(cb.execute(failing)).rejects.toThrow();
      await expect(cb.execute(failing)).rejects.toThrow();
      expect(cb.state).toBe('OPEN');
      expect(cb.isOpen).toBe(true);
    });

    it('should reject calls when OPEN', async () => {
      const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeout: 60_000 });
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      expect(cb.state).toBe('OPEN');
      await expect(cb.execute(() => Promise.resolve('ok'))).rejects.toBeInstanceOf(CircuitOpenError);
    });

    it('should transition to HALF_OPEN after resetTimeout', async () => {
      const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeout: 50 });
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      expect(cb.state).toBe('OPEN');
      await new Promise((r) => setTimeout(r, 60));
      // canExecute triggers transition to HALF_OPEN
      expect(cb.canExecute()).toBe(true);
      expect(cb.state).toBe('HALF_OPEN');
    });

    it('should return to CLOSED after successful HALF_OPEN', async () => {
      const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeout: 50 });
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      await new Promise((r) => setTimeout(r, 60));
      await cb.execute(() => Promise.resolve('recovered'));
      expect(cb.state).toBe('CLOSED');
    });

    it('should re-open if HALF_OPEN test fails', async () => {
      const cb = new CircuitBreaker({ name: 'test', failureThreshold: 1, resetTimeout: 50 });
      await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
      await new Promise((r) => setTimeout(r, 60));
      await expect(cb.execute(() => Promise.reject(new Error('still broken')))).rejects.toThrow();
      expect(cb.state).toBe('OPEN');
    });
  });

  describe('stats', () => {
    it('should track successes and failures', async () => {
      const cb = new CircuitBreaker({ name: 'test', failureThreshold: 10 });
      await cb.execute(() => Promise.resolve('a'));
      await cb.execute(() => Promise.resolve('b'));
      await expect(cb.execute(() => Promise.reject(new Error('c')))).rejects.toThrow();
      const stats = cb.stats;
      expect(stats.successes).toBe(2);
      expect(stats.failures).toBe(1);
      expect(stats.lastSuccess).toBeTypeOf('number');
      expect(stats.lastFailure).toBeTypeOf('number');
    });
  });

  describe('singletons', () => {
    it('should expose named circuits', () => {
      expect(circuits.database).toBeInstanceOf(CircuitBreaker);
      expect(circuits.supabase).toBeInstanceOf(CircuitBreaker);
      expect(circuits.external).toBeInstanceOf(CircuitBreaker);
      expect(circuits.database.stats.state).toBe('CLOSED');
    });
  });

  describe('CircuitOpenError', () => {
    it('should have the right shape', () => {
      const err = new CircuitOpenError('circuit X is OPEN');
      expect(err.name).toBe('CircuitOpenError');
      expect(err.code).toBe('CIRCUIT_OPEN');
      expect(err).toBeInstanceOf(Error);
    });
  });
});
