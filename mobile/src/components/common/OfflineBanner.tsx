/**
 * Offline Banner Component
 * Shows when device is offline
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNetwork } from '../contexts/NetworkContext';
import { useAppSelector } from '../hooks/useAppSelector';
import { selectPendingCount } from '../store/slices/offlineSlice';

export function OfflineBanner() {
  const theme = useTheme();
  const { isOnline } = useNetwork();
  const pendingCount = useAppSelector(selectPendingCount);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  const backgroundColor = isOnline ? theme.colors.secondary : theme.colors.error;
  const message = isOnline
    ? `Syncing ${pendingCount} pending changes...`
    : `You are offline. ${pendingCount} changes will sync when connection is restored.`;

  return (
    <Animated.View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.text, { color: theme.colors.onError }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});