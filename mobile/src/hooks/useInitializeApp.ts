/**
 * App initialization hook
 */

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setupNetworkListener, restoreSession } from '../api/client';
import { setUser, setLoading, logout } from '../store/slices/authSlice';

export function useInitializeApp() {
  const dispatch = useDispatch();

  const initializeApp = useCallback(async () => {
    try {
      dispatch(setLoading(true));

      // Setup network listener
      setupNetworkListener();

      // Restore session
      const restored = await restoreSession();

      if (!restored) {
        dispatch(logout());
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      dispatch(logout());
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  return { initializeApp };
}