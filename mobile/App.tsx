/**
 * National Labor Platform Mobile App
 * Main application entry point
 */

import React, { useEffect } from 'react';
import { StatusBar, LogBox, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import { Provider as ReduxProvider } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { store } from './src/store';
import { RootNavigator } from './src/navigation/RootNavigator';
import { i18n } from './src/i18n';
import { useAppSelector } from './src/hooks/useAppSelector';
import { useAppDispatch } from './src/hooks/useAppDispatch';
import { useInitializeApp } from './src/hooks/useInitializeApp';
import { selectIsAuthenticated, selectIsLoading } from './src/store/slices/authSlice';
import { selectTheme } from './src/store/slices/settingsSlice';
import { AuthProvider } from './src/contexts/AuthContext';
import { NetworkProvider } from './src/contexts/NetworkContext';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
]);

// Create query client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    },
  },
});

// Light theme
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1E40AF', // Blue
    secondary: '#059669', // Green
    tertiary: '#DC2626', // Red
    background: '#F8FAFC',
    surface: '#FFFFFF',
    error: '#DC2626',
  },
};

// Dark theme
const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#60A5FA', // Light Blue
    secondary: '#34D399', // Light Green
    tertiary: '#F87171', // Light Red
    background: '#0F172A',
    surface: '#1E293B',
    error: '#F87171',
  },
};

/** Inner app component that uses Redux */
function AppContent() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isLoading = useAppSelector(selectIsLoading);
  const themeMode = useAppSelector(selectTheme);
  const { initializeApp } = useInitializeApp();

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <RootNavigator isAuthenticated={isAuthenticated} />
    </PaperProvider>
  );
}

/** Root App component */
export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={i18n}>
              <AuthProvider>
                <NetworkProvider>
                  <AppContent />
                </NetworkProvider>
              </AuthProvider>
            </I18nextProvider>
          </QueryClientProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});