// capacitor.config.ts — Mobile App Configuration
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ye.gov.mosal.labor',
  appName: 'منصة العمل الوطنية',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#1e40af'
    },
    Camera: {
      permissions: ['camera', 'photos']
    },
    Geolocation: {
      permissions: ['location', 'locationAlways']
    },
    Device: {
      permissions: ['deviceInfo']
    },
    Network: {
      permissions: ['networkState']
    },
    FileSystem: {
      permissions: ['read', 'write']
    },
    BiometricAuth: {
      reason: 'المصادقة البيومترية للوصول للمنصة',
      title: 'تسجيل الدخول',
      subtitle: 'بصمة الإصبع أو الوجه',
      description: 'استخدم البصمة للدخول بأمان'
    },
    BackgroundTask: {
      enabled: true
    },
    Network: {
      permissions: ['networkState', 'wifiState']
    },
    BackgroundMode: {
      enabled: true,
      title: 'منصة العمل تعمل في الخلفية',
      text: 'مزامنة البيانات قيد التنفيذ',
      icon: 'ic_stat_icon',
      color: '#1e40af'
    },
    App: {
      launchUrl: '/ministry/national-platform'
    }
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH,
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
      keystoreAlias: process.env.ANDROID_KEY_ALIAS,
      keystoreAliasPassword: process.env.ANDROID_KEY_PASSWORD,
      releaseType: 'APK'
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.RECORD_AUDIO',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.WAKE_LOCK',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.BIOMETRIC',
      'android.permission.USE_BIOMETRIC',
      'android.permission.USE_FINGERPRINT',
      'android.permission.FLASHLIGHT'
    ],
    buildOptions: {
      minSdkVersion: 24,
      targetSdkVersion: 34,
      compileSdkVersion: 34,
      aab: true
    }
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    limitsNavBarToVisibleBounds: true,
    preferredContentMode: 'mobile',
    scheme: 'laborplatform',
    buildOptions: {
      teamId: process.env.IOS_TEAM_ID,
      scheme: 'LaborPlatform',
      configuration: 'Release',
      xcodeVersion: '15.0'
    },
    permissions: [
      'NSCameraUsageDescription',
      'NSMicrophoneUsageDescription',
      'NSLocationWhenInUseUsageDescription',
      'NSLocationAlwaysAndWhenInUseUsageDescription',
      'NSPhotoLibraryAddUsageDescription',
      'NSFaceIDUsageDescription'
    ]
  }
};

export default config;