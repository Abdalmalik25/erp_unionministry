/**
 * Login Screen
 */

import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { login } from '../../api/client';
import { setUser } from '../../store/slices/authSlice';

export function LoginScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t('auth.invalidCredentials'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await login(email, password);
      if (success) {
        // Session restored successfully
      }
    } catch (err: any) {
      setError(err.message || t('auth.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo and Title */}
          <View style={styles.header}>
            <Surface style={[styles.logoContainer, { backgroundColor: theme.colors.primary }]} elevation={2}>
              <Text style={styles.logoText}>NLP</Text>
            </Surface>
            <Text variant="headlineLarge" style={[styles.title, { color: theme.colors.onBackground }]}>
              {t('dashboard.title')}
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Ministry of Labor - Yemen
            </Text>
          </View>

          {/* Login Form */}
          <Surface style={[styles.formContainer, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <Text variant="titleLarge" style={styles.formTitle}>
              {t('auth.login')}
            </Text>

            <TextInput
              mode="outlined"
              label={t('auth.email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
            />

            <TextInput
              mode="outlined"
              label={t('auth.password')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
            />

            {error && (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            )}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {t('auth.login')}
            </Button>

            <Button
              mode="text"
              onPress={() => {}}
              style={styles.forgotButton}
            >
              {t('auth.forgotPassword')}
            </Button>
          </Surface>

          {/* Language Toggle */}
          <View style={styles.languageToggle}>
            <Button
              mode="text"
              onPress={() => {}}
              compact
            >
              العربية
            </Button>
            <Button
              mode="text"
              onPress={() => {}}
              compact
            >
              English
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  formContainer: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
  },
  formTitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  forgotButton: {
    marginTop: 0,
  },
  languageToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
});