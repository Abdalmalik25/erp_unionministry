/**
 * Biometric Setup Screen
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme, Surface } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

export function BiometricSetupScreen() {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.content} elevation={0}>
        <Icon
          name="fingerprint"
          size={80}
          color={theme.colors.primary}
          style={styles.icon}
        />
        <Text variant="headlineSmall" style={styles.title}>
          {t('auth.enableBiometric')}
        </Text>
        <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
          Use your fingerprint to quickly and securely access the app
        </Text>
        <View style={styles.buttons}>
          <Button mode="contained" style={styles.button}>
            Enable
          </Button>
          <Button mode="text" style={styles.button}>
            Skip
          </Button>
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
  },
});