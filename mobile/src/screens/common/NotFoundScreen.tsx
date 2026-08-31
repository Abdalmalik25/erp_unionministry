/**
 * NotFound Screen - 404 screen for unknown routes
 */
import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Button,
  Card,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../hooks/useAppSelector';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function NotFoundScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const { language } = useAppSelector((state) => state.settings);
  const isRTL = language === 'ar';

  const handleGoHome = () => {
    navigation.navigate('Main' as any);
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      handleGoHome();
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Icon
              name="map-marker-off"
              size={120}
              color={theme.colors.primary}
            />
          </View>
          
          <Text variant="displayLarge" style={styles.errorCode}>
            404
          </Text>
          
          <Text variant="headlineMedium" style={styles.title}>
            {isRTL ? 'الصفحة غير موجودة' : 'Page Not Found'}
          </Text>
          
          <Text variant="bodyLarge" style={styles.message}>
            {isRTL 
              ? 'عذراً، لم نتمكن من العثور على الصفحة التي تبحث عنها. قد تكون قد تم نقلها أو حذفها.'
              : 'Sorry, we couldn\'t find the page you\'re looking for. It may have been moved or deleted.'}
          </Text>
          
          <View style={styles.actions}>
            <Button
              mode="contained"
              icon="home"
              onPress={handleGoHome}
              style={styles.actionButton}
            >
              {isRTL ? 'الصفحة الرئيسية' : 'Go Home'}
            </Button>
            <Button
              mode="outlined"
              icon="arrow-left"
              onPress={handleGoBack}
              style={styles.actionButton}
            >
              {isRTL ? 'العودة' : 'Go Back'}
            </Button>
          </View>
          
          <View style={styles.helpSection}>
            <Text variant="labelLarge" style={styles.helpTitle}>
              {isRTL ? 'هل تحتاج مساعدة؟' : 'Need Help?'}
            </Text>
            <View style={styles.helpLinks}>
              <Button
                compact
                icon="help-circle"
                onPress={() => {
                  // Navigate to help
                }}
              >
                {isRTL ? 'مركز المساعدة' : 'Help Center'}
              </Button>
              <Button
                compact
                icon="email"
                onPress={() => {
                  // Open email
                }}
              >
                {isRTL ? 'اتصل بالدعم' : 'Contact Support'}
              </Button>
            </View>
          </View>
        </Card.Content>
      </Card>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
  },
  cardContent: {
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  errorCode: {
    fontSize: 96,
    fontWeight: '900',
    opacity: 0.1,
    lineHeight: 96,
    marginBottom: 8,
  },
  title: {
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 32,
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    width: '100%',
  },
  helpSection: {
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 24,
  },
  helpTitle: {
    marginBottom: 8,
    opacity: 0.7,
  },
  helpLinks: {
    flexDirection: 'row',
    gap: 8,
  },
});
