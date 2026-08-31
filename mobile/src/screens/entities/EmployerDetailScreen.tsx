/**
 * Employer Detail Screen - Full employer information and actions
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Chip,
  Divider,
  List,
  IconButton,
  ActivityIndicator,
  Surface,
  useTheme,
  Avatar,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchEmployerById, selectCurrentEmployer } from '../../store/slices/employersSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type RouteProps = RouteProp<RootStackParamList, 'EmployerDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EmployerDetails {
  id: string;
  name_ar: string;
  name_en: string;
  registration_number: string;
  commercial_record: string;
  tax_number: string;
  economic_activity: string;
  sector: string;
  employee_count: number;
  expatriate_count: number;
  yemeni_count: number;
  governorate: string;
  district: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  status: 'active' | 'suspended' | 'pending';
  license_number: string;
  license_expiry: string;
  inspection_count: number;
  violation_count: number;
  last_inspection_date: string;
  created_at: string;
  updated_at: string;
}

export function EmployerDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const { employerId } = route.params;
  const { employer, loading, error } = useAppSelector((state) => state.employers);
  const { language } = useAppSelector((state) => state.settings);
  
  const [refreshing, setRefreshing] = useState(false);
  
  const isRTL = language === 'ar';

  useEffect(() => {
    dispatch(fetchEmployerById(employerId));
  }, [dispatch, employerId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEmployerById(employerId));
    setRefreshing(false);
  }, [dispatch, employerId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'suspended': return '#FF9800';
      case 'pending': return '#2196F3';
      default: return theme.colors.outline;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return isRTL ? 'نشط' : 'Active';
      case 'suspended': return isRTL ? 'معلق' : 'Suspended';
      case 'pending': return isRTL ? 'قيد الانتظار' : 'Pending';
      default: return status;
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleStartInspection = () => {
    navigation.navigate('CreateInspection', { employerId });
  };

  const handleViewOnMap = () => {
    navigation.navigate('Map', { employerId });
  };

  if (loading && !employer) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !employer) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle" size={64} color={theme.colors.error} />
        <Text variant="bodyLarge" style={styles.errorText}>
          {isRTL ? 'فشل تحميل بيانات صاحب العمل' : 'Failed to load employer data'}
        </Text>
        <Button mode="outlined" onPress={() => dispatch(fetchEmployerById(employerId))}>
          {isRTL ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </View>
    );
  }

  const details = employer as EmployerDetails;

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Avatar.Icon
                size={64}
                icon="domain"
                style={{ backgroundColor: theme.colors.primaryContainer }}
              />
              <View style={styles.headerInfo}>
                <Text variant="headlineSmall" style={styles.employerName}>
                  {isRTL ? details.name_ar : details.name_en || details.name_ar}
                </Text>
                <Chip
                  mode="flat"
                  style={[styles.statusChip, { backgroundColor: getStatusColor(details.status) + '20' }]}
                  textStyle={{ color: getStatusColor(details.status) }}
                >
                  {getStatusLabel(details.status)}
                </Chip>
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="clipboard-check"
                onPress={handleStartInspection}
                style={styles.actionButton}
              >
                {isRTL ? 'بدء التفتيش' : 'Start Inspection'}
              </Button>
              <IconButton
                icon="map-marker"
                mode="contained-tonal"
                onPress={handleViewOnMap}
              />
              <IconButton
                icon="phone"
                mode="contained-tonal"
                onPress={() => handleCall(details.phone)}
              />
              <IconButton
                icon="email"
                mode="contained-tonal"
                onPress={() => handleEmail(details.email)}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Surface style={styles.statCard} elevation={1}>
            <Icon name="account-group" size={24} color={theme.colors.primary} />
            <Text variant="headlineSmall">{details.employee_count}</Text>
            <Text variant="bodySmall">{isRTL ? 'إجمالي الموظفين' : 'Total Employees'}</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={1}>
            <Icon name="clipboard-check" size={24} color={theme.colors.primary} />
            <Text variant="headlineSmall">{details.inspection_count}</Text>
            <Text variant="bodySmall">{isRTL ? 'عمليات التفتيش' : 'Inspections'}</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={1}>
            <Icon name="alert" size={24} color={theme.colors.error} />
            <Text variant="headlineSmall">{details.violation_count}</Text>
            <Text variant="bodySmall">{isRTL ? 'المخالفات' : 'Violations'}</Text>
          </Surface>
        </View>

        {/* Registration Details */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'بيانات التسجيل' : 'Registration Details'}
            left={(props) => <Icon {...props} name="card-account-details" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'رقم التسجيل' : 'Registration Number'}
              description={details.registration_number}
              left={(props) => <List.Icon {...props} icon="identifier" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'السجل التجاري' : 'Commercial Record'}
              description={details.commercial_record}
              left={(props) => <List.Icon {...props} icon="file-document" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'الرقم الضريبي' : 'Tax Number'}
              description={details.tax_number}
              left={(props) => <List.Icon {...props} icon="receipt" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'رقم الرخصة' : 'License Number'}
              description={details.license_number}
              left={(props) => <List.Icon {...props} icon="certificate" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'تاريخ انتهاء الرخصة' : 'License Expiry'}
              description={new Date(details.license_expiry).toLocaleDateString()}
              left={(props) => <List.Icon {...props} icon="calendar" />}
            />
          </Card.Content>
        </Card>

        {/* Business Details */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'تفاصيل النشاط التجاري' : 'Business Details'}
            left={(props) => <Icon {...props} name="domain" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'النشاط الاقتصادي' : 'Economic Activity'}
              description={details.economic_activity}
              left={(props) => <List.Icon {...props} icon="briefcase" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'القطاع' : 'Sector'}
              description={details.sector}
              left={(props) => <List.Icon {...props} icon="domain" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'عدد اليمنيين' : 'Yemeni Employees'}
              description={String(details.yemeni_count)}
              left={(props) => <List.Icon {...props} icon="flag" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'عدد الوافدين' : 'Expatriate Employees'}
              description={String(details.expatriate_count)}
              left={(props) => <List.Icon {...props} icon="airplane" />}
            />
          </Card.Content>
        </Card>

        {/* Location Details */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'الموقع' : 'Location'}
            left={(props) => <Icon {...props} name="map-marker" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'المحافظة' : 'Governorate'}
              description={details.governorate}
              left={(props) => <List.Icon {...props} icon="map" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'المنطقة' : 'District'}
              description={details.district}
              left={(props) => <List.Icon {...props} icon="map-marker-radius" />}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'العنوان' : 'Address'}
              description={details.address}
              left={(props) => <List.Icon {...props} icon="home" />}
            />
          </Card.Content>
        </Card>

        {/* Contact Details */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'معلومات الاتصال' : 'Contact Information'}
            left={(props) => <Icon {...props} name="phone" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'الهاتف' : 'Phone'}
              description={details.phone}
              left={(props) => <List.Icon {...props} icon="phone" />}
              onPress={() => handleCall(details.phone)}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'البريد الإلكتروني' : 'Email'}
              description={details.email}
              left={(props) => <List.Icon {...props} icon="email" />}
              onPress={() => handleEmail(details.email)}
            />
            {details.website && (
              <>
                <Divider />
                <List.Item
                  title={isRTL ? 'الموقع الإلكتروني' : 'Website'}
                  description={details.website}
                  left={(props) => <List.Icon {...props} icon="web" />}
                  onPress={() => Linking.openURL(details.website)}
                />
              </>
            )}
          </Card.Content>
        </Card>

        {/* Last Inspection */}
        {details.last_inspection_date && (
          <Card style={styles.sectionCard}>
            <Card.Title
              title={isRTL ? 'آخر تفتيش' : 'Last Inspection'}
              left={(props) => <Icon {...props} name="clipboard-check-outline" />}
            />
            <Card.Content>
              <Text variant="bodyMedium">
                {new Date(details.last_inspection_date).toLocaleDateString()}
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginVertical: 16,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerInfo: {
    flex: 1,
  },
  employerName: {
    fontWeight: '600',
    marginBottom: 8,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  sectionCard: {
    marginBottom: 16,
  },
});
