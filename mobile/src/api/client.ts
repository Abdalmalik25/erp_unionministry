/**
 * API Client for Mobile App
 * Wrapper around SDK with offline support and caching
 */

import { NationalLaborPlatformClient, SDKConfig, SDKError } from '@national-labor-platform/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { store } from '../store';
import { setTokens, logout } from '../store/slices/authSlice';
import { addOfflineAction, removeOfflineAction } from '../store/slices/offlineSlice';

const API_BASE_URL = 'https://api.labor.gov.ye/v2';
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'nlp_access_token',
  REFRESH_TOKEN: 'nlp_refresh_token',
  USER: 'nlp_user',
};

// Singleton API client
let apiClient: NationalLaborPlatformClient | null = null;
let isOnline = true;

// Initialize API client
export function initializeApiClient(): NationalLaborPlatformClient {
  if (!apiClient) {
    apiClient = new NationalLaborPlatformClient({
      baseURL: API_BASE_URL,
      timeout: 30000,
      onTokenRefresh: async (tokens) => {
        // Save new tokens
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
        store.dispatch(setTokens(tokens.accessToken, tokens.refreshToken));
      },
    });
  }
  return apiClient;
}

// Get API client instance
export function getApiClient(): NationalLaborPlatformClient {
  if (!apiClient) {
    return initializeApiClient();
  }
  return apiClient;
}

// Setup network listener
export function setupNetworkListener(): () => void {
  return NetInfo.addEventListener((state: NetInfoState) => {
    const wasOnline = isOnline;
    isOnline = state.isConnected && state.isInternetReachable !== false;

    // Sync offline actions when coming back online
    if (wasOnline === false && isOnline === true) {
      syncOfflineActions();
    }
  });
}

// Check if online
export function isNetworkOnline(): boolean {
  return isOnline;
}

// Login with offline support
export async function login(email: string, password: string): Promise<boolean> {
  const client = getApiClient();

  try {
    const response = await client.auth.login({ email, password });

    // Save tokens securely
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
    await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refreshToken);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));

    // Update store
    store.dispatch(setTokens(response.accessToken, response.refreshToken));

    return true;
  } catch (error) {
    if (!isOnline) {
      // Queue for offline
      store.dispatch(addOfflineAction({
        type: 'auth/login',
        payload: { email, password },
        timestamp: Date.now(),
      }));
      return true; // Return success, will sync later
    }
    throw error;
  }
}

// Logout
export async function logout(): Promise<void> {
  const client = getApiClient();

  try {
    await client.auth.logout();
  } catch {
    // Ignore errors on logout
  }

  // Clear stored data
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);

  // Update store
  store.dispatch(logout());
}

// Restore session
export async function restoreSession(): Promise<boolean> {
  try {
    const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (accessToken) {
      const client = getApiClient();
      client.setAccessToken(accessToken);
      client.setRefreshToken(refreshToken);

      // Verify token is still valid
      const user = await client.auth.me();
      store.dispatch(setTokens(accessToken, refreshToken));

      return true;
    }
  } catch {
    // Token invalid, clear session
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  }

  return false;
}

// Generic API call with offline support
export async function apiCall<T>(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  data?: any,
  offlineKey?: string,
): Promise<T> {
  const client = getApiClient();

  // Check if offline and it's a write operation
  if (!isOnline && offlineKey && (method === 'post' || method === 'put' || method === 'delete')) {
    // Queue for offline
    store.dispatch(addOfflineAction({
      type: `${method}:${path}`,
      payload: data,
      timestamp: Date.now(),
    }));

    // Return cached data if available
    const cached = await AsyncStorage.getItem(`cache:${offlineKey}`);
    if (cached) {
      return JSON.parse(cached);
    }

    throw new Error('No cached data available and offline');
  }

  try {
    let response: any;

    switch (method) {
      case 'get':
        response = await client.request({ method: 'GET', url: path });
        break;
      case 'post':
        response = await client.request({ method: 'POST', url: path, data });
        break;
      case 'put':
        response = await client.request({ method: 'PUT', url: path, data });
        break;
      case 'delete':
        response = await client.request({ method: 'DELETE', url: path });
        break;
    }

    // Cache response if offlineKey provided
    if (offlineKey) {
      await AsyncStorage.setItem(`cache:${offlineKey}`, JSON.stringify(response));
    }

    return response;
  } catch (error) {
    // Try to return cached data on error
    if (offlineKey) {
      const cached = await AsyncStorage.getItem(`cache:${offlineKey}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    throw error;
  }
}

// Sync offline actions when back online
async function syncOfflineActions() {
  const offlineActions = store.getState().offline.pendingActions;

  for (const action of offlineActions) {
    try {
      const [method, path] = action.type.split(':');

      await apiCall(
        method as 'get' | 'post' | 'put' | 'delete',
        path,
        action.payload,
      );

      // Remove from queue
      store.dispatch(removeOfflineAction(action.timestamp));
    } catch {
      // Keep in queue for retry
    }
  }
}

// Clear all cached data
export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith('cache:'));
  await AsyncStorage.multiRemove(cacheKeys);
}

// Export client for direct access if needed
export { apiClient };