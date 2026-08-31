// src/app/hooks/useFeature.ts
// React hook for feature flags with auto language support

import { useCallback } from 'react';
import { isFeatureEnabled, type FeatureKey } from '../utils/featureFlags';
import { useAuth } from '../contexts/AuthContext';

// Extract userId and role safely regardless of User shape
function getUserContext(user: unknown) {
  if (!user) return { userId: undefined, role: undefined };
  const u = user as Record<string, unknown>;
  return {
    userId: String(u.id ?? u.sub ?? u.userId ?? ''),
    role: String(u.role ?? u.userType ?? ''),
  };
}

/**
 * Check if a feature flag is enabled for the current user
 * Automatically reads user role from auth context
 */
export function useFeature(key: FeatureKey): boolean {
  const { user } = useAuth();
  const { userId, role } = getUserContext(user);
  return isFeatureEnabled(key, userId, role);
}

/**
 * Check multiple feature flags at once
 */
export function useFeatures(keys: FeatureKey[]): Record<FeatureKey, boolean> {
  const { user } = useAuth();
  const { userId, role } = getUserContext(user);
  return keys.reduce((acc, key) => {
    acc[key] = isFeatureEnabled(key, userId, role);
    return acc;
  }, {} as Record<FeatureKey, boolean>);
}

/**
 * Hook that returns a function to manually check a flag
 * Useful for conditional rendering outside of components
 */
export function useFeatureChecker() {
  const { user } = useAuth();
  const { userId, role } = getUserContext(user);
  return useCallback(
    (key: FeatureKey) => isFeatureEnabled(key, userId, role),
    [userId, role],
  );
}
