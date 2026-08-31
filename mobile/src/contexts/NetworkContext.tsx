/**
 * Network Context Provider
 * Tracks online/offline state and syncs data
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextValue {
  isOnline: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  isInternetReachable: null,
  connectionType: null,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [networkState, setNetworkState] = useState<NetworkContextValue>({
    isOnline: true,
    isInternetReachable: null,
    connectionType: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState({
        isOnline: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        connectionType: state.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}