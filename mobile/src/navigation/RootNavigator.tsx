/**
 * Root Navigation - handles auth flow and main navigation
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../hooks/useAppSelector';
import { selectUser } from '../store/slices/authSlice';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { BiometricSetupScreen } from '../screens/auth/BiometricSetupScreen';

// Main Screens (Inspector Tab)
import { DashboardScreen } from '../screens/inspector/DashboardScreen';
import { InspectionsScreen } from '../screens/inspector/InspectionsScreen';
import { InspectionDetailScreen } from '../screens/inspector/InspectionDetailScreen';
import { CreateInspectionScreen } from '../screens/inspector/CreateInspectionScreen';
import { ViolationFormScreen } from '../screens/inspector/ViolationFormScreen';

// Entity Screens
import { EmployersScreen } from '../screens/entities/EmployersScreen';
import { EmployerDetailScreen } from '../screens/entities/EmployerDetailScreen';
import { WorkersScreen } from '../screens/entities/WorkersScreen';
import { WorkerDetailScreen } from '../screens/entities/WorkerDetailScreen';

// Utility Screens
import { MapScreen } from '../screens/utilities/MapScreen';
import { CameraScreen } from '../screens/utilities/CameraScreen';
import { DocumentsScreen } from '../screens/utilities/DocumentsScreen';

// Settings Screens
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { SyncScreen } from '../screens/settings/SyncScreen';

// Common
import { NotFoundScreen } from '../screens/common/NotFoundScreen';
import { OfflineBanner } from '../components/common/OfflineBanner';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Login: undefined;
  BiometricSetup: undefined;
  InspectionDetail: { inspectionId: string };
  CreateInspection: { employerId?: string };
  ViolationForm: { inspectionId: string };
  EmployerDetail: { employerId: string };
  WorkerDetail: { workerId: string };
  Map: { employerId?: string; latitude?: number; longitude?: number };
  Camera: { inspectionId?: string; type: 'violation' | 'evidence' | 'worker' };
  Profile: undefined;
  Sync: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Inspections: undefined;
  Employers: undefined;
  Workers: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

/** Bottom tab navigator for main app */
function MainTabs() {
  const theme = useTheme();

  return (
    <>
      <OfflineBanner />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;

            switch (route.name) {
              case 'Dashboard':
                iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
                break;
              case 'Inspections':
                iconName = focused ? 'clipboard-check' : 'clipboard-check-outline';
                break;
              case 'Employers':
                iconName = focused ? 'factory' : 'factory-outline';
                break;
              case 'Workers':
                iconName = focused ? 'account-group' : 'account-group-outline';
                break;
              case 'Settings':
                iconName = focused ? 'cog' : 'cog-outline';
                break;
              default:
                iconName = 'help-circle';
            }

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.outline,
          },
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
        })}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Dashboard', tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="Inspections"
          component={InspectionsScreen}
          options={{ title: 'Inspections' }}
        />
        <Tab.Screen
          name="Employers"
          component={EmployersScreen}
          options={{ title: 'Employers' }}
        />
        <Tab.Screen
          name="Workers"
          component={WorkersScreen}
          options={{ title: 'Workers' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </>
  );
}

/** Root navigator - handles auth flow */
export function RootNavigator({ isAuthenticated }: { isAuthenticated: boolean }) {
  const theme = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: theme.dark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.surface,
          text: theme.colors.onSurface,
          border: theme.colors.outline,
          notification: theme.colors.error,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onSurface,
          headerBackTitleVisible: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // Main App Stack
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InspectionDetail"
              component={InspectionDetailScreen}
              options={{ title: 'Inspection Details' }}
            />
            <Stack.Screen
              name="CreateInspection"
              component={CreateInspectionScreen}
              options={{ title: 'New Inspection' }}
            />
            <Stack.Screen
              name="ViolationForm"
              component={ViolationFormScreen}
              options={{ title: 'Report Violation' }}
            />
            <Stack.Screen
              name="EmployerDetail"
              component={EmployerDetailScreen}
              options={{ title: 'Employer Details' }}
            />
            <Stack.Screen
              name="WorkerDetail"
              component={WorkerDetailScreen}
              options={{ title: 'Worker Details' }}
            />
            <Stack.Screen
              name="Map"
              component={MapScreen}
              options={{ title: 'Location' }}
            />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={{ title: 'Capture Photo', headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'My Profile' }}
            />
            <Stack.Screen
              name="Sync"
              component={SyncScreen}
              options={{ title: 'Offline Data' }}
            />
            <Stack.Screen
              name="BiometricSetup"
              component={BiometricSetupScreen}
              options={{ title: 'Enable Biometrics' }}
            />
          </>
        )}
        <Stack.Screen
          name="NotFound"
          component={NotFoundScreen}
          options={{ title: 'Not Found' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}