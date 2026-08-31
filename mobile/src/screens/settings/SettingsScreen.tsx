/**
 * Settings Screen - App preferences and configuration
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Card,
  List,
  Divider,
  Button,
  RadioButton,
  Dialog,
  Portal,
  SegmentedButtons,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateSettings } from '../../store/slices/settingsSlice';
import { clearAuth, logout } from '../../store/slices/authSlice';
import { resetOfflineQueue } from '../../store/slices/offlineSlice';
import { clearInspections } from '../../store/slices/inspectionsSlice';
import { clearEmployers } from '../../store/slices/employersSlice';
import { clearWorkers } from '../../store/slices/workersSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SETTINGS_KEY = '@nlp_settings';

export function SettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const { settings, language } = useAppSelector((state) => state.settings);
  const { user } = useAppSelector((state) => state.auth);
  
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [themeDialogVisible, setThemeDialogVisible] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [highQualityPhotos, setHighQualityPhotos] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  
  const isRTL = language === 'ar';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setBiometricEnabled(parsed.biometricEnabled || false);
        setPushNotifications(parsed.pushNotifications !== false);
        setEmailNotifications(parsed.emailNotifications !== false);
        setAutoSync(parsed.autoSync !== false);
        setHighQualityPhotos(parsed.highQualityPhotos || false);
        setAnalyticsEnabled(parsed.analyticsEnabled !== false);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: Record<string, any>) => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      const current = stored ? JSON.parse(stored) : {};
      const updated = { ...current, ...newSettings };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleLanguageChange = (newLanguage: 'en' | 'ar') => {
    dispatch(updateSettings({ language: newLanguage }));
    setLanguageDialogVisible(false);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    dispatch(updateSettings({ theme: newTheme }));
    setThemeDialogVisible(false);
  };

  const handleBiometricToggle = (value: boolean) => {
    setBiometricEnabled(value);
    saveSettings({ biometricEnabled: value });
  };

  const handlePushToggle = (value: boolean) => {
    setPushNotifications(value);
    saveSettings({ pushNotifications: value });
  };

  const handleEmailToggle = (value: boolean) => {
    setEmailNotifications(value);
    saveSettings({ emailNotifications: value });
  };

  const handleAutoSyncToggle = (value: boolean) => {
    setAutoSync(value);
    saveSettings({ autoSync: value });
  };

  const handleHighQualityToggle = (value: boolean) => {
    setHighQualityPhotos(value);
    saveSettings({ highQualityPhotos: value });
  };

  const handleAnalyticsToggle = (value: boolean) => {
    setAnalyticsEnabled(value);
    saveSettings({ analyticsEnabled: value });
  };

  const handleClearCache = () => {
    Alert.alert(
      isRTL ? 'مسح ذاكرة التخزين المؤقت' : 'Clear Cache',
      isRTL ? 'هل أنت متأكد من مسح ذاكرة التخزين المؤقت؟' : 'Are you sure you want to clear cache?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'مسح' : 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const keys = await AsyncStorage.getAllKeys();
              const cacheKeys = keys.filter((k) => k.startsWith('@nlp_cache_'));
              await AsyncStorage.multiRemove(cacheKeys);
              Alert.alert(
                isRTL ? 'تم' : 'Success',
                isRTL ? 'تم مسح ذاكرة التخزين المؤقت' : 'Cache cleared successfully'
              );
            } catch (error) {
              Alert.alert(
                isRTL ? 'خطأ' : 'Error',
                isRTL ? 'فشل مسح ذاكرة التخزين المؤقت' : 'Failed to clear cache'
              );
            }
          },
        },
      ]
    );
  };

  const handleClearOfflineData = () => {
    Alert.alert(
      isRTL ? 'مسح البيانات غير المتصلة' : 'Clear Offline Data',
      isRTL 
        ? 'سيتم حذف جميع البيانات المخزنة محلياً. هل أنت متأكد؟' 
        : 'All locally stored data will be deleted. Are you sure?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'مسح' : 'Clear',
          style: 'destructive',
          onPress: () => {
            dispatch(resetOfflineQueue());
            dispatch(clearInspections());
            dispatch(clearEmployers());
            dispatch(clearWorkers());
            Alert.alert(
              isRTL ? 'تم' : 'Success',
              isRTL ? 'تم مسح البيانات غير المتصلة' : 'Offline data cleared'
            );
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    setLogoutDialogVisible(false);
    dispatch(logout());
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <Card style={styles.card}>
          <Card.Title
            title={isRTL ? 'الحساب' : 'Account'}
            left={(props) => <Icon {...props} name="account-circle" />}
          />
          <Card.Content>
            <List.Item
              title={user?.name || (isRTL ? 'المستخدم' : 'User')}
              description={user?.email || user?.role}
              left={(props) => (
                <View {...props}>
                  <Icon name="account" size={32} color={theme.colors.primary} />
                </View>
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Profile')}
            />
          </Card.Content>
        </Card>

        {/* Appearance Section */}
        <Card style={styles.card}>
          <Card.Title
            title={isRTL ? 'المظهر' : 'Appearance'}
            left={(props) => <Icon {...props} name="palette" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'اللغة' : 'Language'}
              description={language === 'ar' ? 'العربية' : 'English'}
              left={(props) => <List.Icon {...props} icon="translate" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => setLanguageDialogVisible(true)}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'السمة' : 'Theme'}
              description={
                settings.theme === 'light' 
                  ? (isRTL ? 'فاتح' : 'Light')
                  : settings.theme === 'dark' 
                  ? (isRTL ? 'داكن' : 'Dark')
                  : (isRTL ? 'تلقائي' : 'System')
              }
              left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => setThemeDialogVisible(true)}
            />
          </Card.Content>
        </Card>

        {/* Security Section */}
        <Card style={styles.card}>
          <Card.Title
            title={isRTL ? 'الأمان' : 'Security'}
            left={(props) => <Icon {...props} name="shield-account" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'تسجيل الدخول الحيوي' : 'Biometric Login'}
              description={
                biometricEnabled 
                  ? (isRTL ? 'مفعّل' : 'Enabled')
                  : (isRTL ? 'معطّل' : 'Disabled')
              }
              left={(props) => <List.Icon {...props} icon="fingerprint" />}
              right={() => (
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                />
              )}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
              left={(props) => <List.Icon {...props} icon="lock-reset" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                Alert.alert(
                  isRTL ? 'تغيير كلمة المرور' : 'Change Password',
                  isRTL ? 'سيتم فتح هذه الميزة قريباً' : 'This feature will be available soon'
                );
              }}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}
              description={isRTL ? 'مفعّلة' : 'Enabled'}
              left={(props) => <List.Icon {...props} icon="two-factor-authentication" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
          </Card.Content>
        </Card>

        {/* Notifications Section */}
        <Card style={styles.card}>
          <Card.Title
            title={isRTL ? 'الإشعارات' : 'Notifications'}
            left={(props) => <Icon {...props} name="bell" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'إشعارات الجوال' : 'Push Notifications'}
              left={(props) => <List.Icon {...props} icon="bell-ring" />}
              right={() => (
                <Switch
                  value={pushNotifications}
                  onValueChange={handlePushToggle}
                />
              )}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}
              left={(props) => <List.Icon {...props} icon="email-alert" />}
              right={() => (
                <Switch
                  value={emailNotifications}
                  onValueChange={handleEmailToggle}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Data & Sync Section */}
        <Card style={styles.card}>
          <Card.Title
            title={isRTL ? 'البيانات والمزامنة' : 'Data & Sync'}
            left={(props) => <Icon {...props} name="sync" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'المزامنة التلقائية' : 'Auto Sync'}
              description={
                autoSync 
                  ? (isRTL ? 'مفعّلة' : 'Enabled')
                  : (isRTL ? 'معطّلة' : 'Disabled')
              }
              left={(props) => <List.Icon {...props} icon="cloud-sync" />}
              right={() => (
                <Switch
                  value={autoSync}
                  onValueChange={handleAutoSyncToggle}
                />
              )}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'حالة المزامنة' : 'Sync Status'}
              left={(props) => <List.Icon {...props} icon="database-sync" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Sync')}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'صور عالية الجودة' : 'High Quality Photos'}
              description={isRTL ? 'يستهلك مساحة أكبر' : 'Uses more storage'}
              left={(props) => <List.Icon {...props} icon="image-high-resolution" />}
              right={() => (
                <Switch
                  value={highQualityPhotos}
                  onValueChange={handleHighQualityToggle}
                />
              )}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'مسح ذاكرة التخزين المؤقت' : 'Clear Cache'}
              left={(props) => <List.Icon {...props} icon="cached" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleClearCache}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'مسح البيانات غير المتصلة' : 'Clear Offline Data'}
              left={(props) => <List.Icon {...props} icon="database-remove" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleClearOfflineData}
            />
          </Card.Content>
        </Card>

        {/* Privacy Section */}
        <Card style={styles.card}>
          <Card.Title
            title={isRTL ? 'الخصوصية' : 'Privacy'}
            left={(props) => <Icon {...props} name="shield-lock" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'تحليلات الاستخدام' : 'Usage Analytics'}
              description={
                isRTL 
                  ? 'ساعدنا في تحسين التطبيق' 
                  : 'Help us improve the app'
              }
              left={(props) => <List.Icon {...props} icon="chart-line" />}
              right={() => (
                <Switch
                  value={analyticsEnabled}
                  onValueChange={handleAnalyticsToggle}
                />
              )}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
              left={(props) => <List.Icon {...props} icon="shield-check" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
          </Card.Content>
        </Card>

        {/* About Section */}
        <Card style={styles.card}>
          <Card.Title
            title={isRTL ? 'حول التطبيق' : 'About'}
            left={(props) => <Icon {...props} name="information" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'الإصدار' : 'Version'}
              description="1.0.0 (Build 1)"
              left={(props) => <List.Icon {...props} icon="tag" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'شروط الخدمة' : 'Terms of Service'}
              left={(props) => <List.Icon {...props} icon="file-document" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'المساعدة والدعم' : 'Help & Support'}
              left={(props) => <List.Icon {...props} icon="help-circle" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button
          mode="contained-tonal"
          icon="logout"
          onPress={() => setLogoutDialogVisible(true)}
          style={styles.logoutButton}
          textColor={theme.colors.error}
        >
          {isRTL ? 'تسجيل الخروج' : 'Logout'}
        </Button>
      </ScrollView>

      {/* Language Dialog */}
      <Portal>
        <Dialog visible={languageDialogVisible} onDismiss={() => setLanguageDialogVisible(false)}>
          <Dialog.Title>{isRTL ? 'اختر اللغة' : 'Select Language'}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => handleLanguageChange(value as 'en' | 'ar')}
              value={language}
            >
              <View style={styles.radioOption}>
                <RadioButton value="en" />
                <Text style={styles.radioLabel}>English</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="ar" />
                <Text style={styles.radioLabel}>العربية</Text>
              </View>
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLanguageDialogVisible(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Theme Dialog */}
      <Portal>
        <Dialog visible={themeDialogVisible} onDismiss={() => setThemeDialogVisible(false)}>
          <Dialog.Title>{isRTL ? 'اختر السمة' : 'Select Theme'}</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group
              onValueChange={(value) => handleThemeChange(value as 'light' | 'dark' | 'system')}
              value={settings.theme || 'system'}
            >
              <View style={styles.radioOption}>
                <RadioButton value="light" />
                <Text style={styles.radioLabel}>{isRTL ? 'فاتح' : 'Light'}</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="dark" />
                <Text style={styles.radioLabel}>{isRTL ? 'داكن' : 'Dark'}</Text>
              </View>
              <View style={styles.radioOption}>
                <RadioButton value="system" />
                <Text style={styles.radioLabel}>{isRTL ? 'تلقائي (النظام)' : 'System'}</Text>
              </View>
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setThemeDialogVisible(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Logout Dialog */}
      <Portal>
        <Dialog visible={logoutDialogVisible} onDismiss={() => setLogoutDialogVisible(false)}>
          <Dialog.Title>{isRTL ? 'تسجيل الخروج' : 'Logout'}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {isRTL 
                ? 'هل أنت متأكد من تسجيل الخروج؟ سيتم مسح البيانات الحساسة.'
                : 'Are you sure you want to logout? Sensitive data will be cleared.'}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLogoutDialogVisible(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onPress={handleLogout} textColor={theme.colors.error}>
              {isRTL ? 'تسجيل الخروج' : 'Logout'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 16,
  },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  radioLabel: {
    fontSize: 16,
  },
});
