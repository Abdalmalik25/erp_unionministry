/**
 * Worker Detail Screen - Full worker information and documents
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
  DataTable,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchWorkerById, selectCurrentWorker } from '../../store/slices/workersSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type RouteProps = RouteProp<RootStackParamList, 'WorkerDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface WorkerDetails {
  id: string;
  full_name_ar: string;
  full_name_en: string;
  national_id: string;
  passport_number: string;
  date_of_birth: string;
  place_of_birth: string;
  gender: 'male' | 'female';
  marital_status: 'single' | 'married' | 'divorced' | 'widowed';
  nationality: string;
  profession: string;
  specialization: string;
  qualification: string;
  years_experience: number;
  employer_id: string;
  employer_name: string;
  contract_type: 'permanent' | 'temporary' | 'contractor';
  contract_start_date: string;
  contract_end_date: string;
  monthly_salary: number;
  currency: string;
  bank_name: string;
  bank_account: string;
  phone: string;
  email: string;
  governorate: string;
  district: string;
  address: string;
  status: 'active' | 'suspended' | 'terminated';
  registration_date: string;
  work_permit_number: string;
  work_permit_expiry: string;
  insurance_number: string;
  inspection_count: number;
  violation_count: number;
  created_at: string;
  updated_at: string;
}

export function WorkerDetailScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const { workerId } = route.params;
  const { worker, loading, error } = useAppSelector((state) => state.workers);
  const { language } = useAppSelector((state) => state.settings);
  
  const [refreshing, setRefreshing] = useState(false);
  
  const isRTL = language === 'ar';

  useEffect(() => {
    dispatch(fetchWorkerById(workerId));
  }, [dispatch, workerId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchWorkerById(workerId));
    setRefreshing(false);
  }, [dispatch, workerId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'suspended': return '#FF9800';
      case 'terminated': return '#F44336';
      default: return theme.colors.outline;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return isRTL ? 'نشط' : 'Active';
      case 'suspended': return isRTL ? 'معلق' : 'Suspended';
      case 'terminated': return isRTL ? 'منتهي' : 'Terminated';
      default: return status;
    }
  };

  const getContractLabel = (type: string) => {
    switch (type) {
      case 'permanent': return isRTL ? 'دائم' : 'Permanent';
      case 'temporary': return isRTL ? 'مؤقت' : 'Temporary';
      case 'contractor': return isRTL ? 'مقاول' : 'Contractor';
      default: return type;
    }
  };

  const getGenderLabel = (gender: string) => {
    return gender === 'male' ? (isRTL ? 'ذكر' : 'Male') : (isRTL ? 'أنثى' : 'Female');
  };

  const getMaritalLabel = (status: string) => {
    switch (status) {
      case 'single': return isRTL ? 'أعزب' : 'Single';
      case 'married': return isRTL ? 'متزوج' : 'Married';
      case 'divorced': return isRTL ? 'مطلق' : 'Divorced';
      case 'widowed': return isRTL ? 'أرمل' : 'Widowed';
      default: return status;
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleViewEmployer = (employerId: string) => {
    navigation.navigate('EmployerDetail', { employerId });
  };

  const handleViewDocuments = () => {
    navigation.navigate('Documents', { workerId });
  };

  if (loading && !worker) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !worker) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="alert-circle" size={64} color={theme.colors.error} />
        <Text variant="bodyLarge" style={styles.errorText}>
          {isRTL ? 'فشل تحميل بيانات العامل' : 'Failed to load worker data'}
        </Text>
        <Button mode="outlined" onPress={() => dispatch(fetchWorkerById(workerId))}>
          {isRTL ? 'إعادة المحاولة' : 'Retry'}
        </Button>
      </View>
    );
  }

  const details = worker as WorkerDetails;

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
              <Avatar.Text
                size={64}
                label={details.full_name_ar.substring(0, 2)}
                style={{ backgroundColor: theme.colors.primaryContainer }}
              />
              <View style={styles.headerInfo}>
                <Text variant="headlineSmall" style={styles.workerName}>
                  {isRTL ? details.full_name_ar : details.full_name_en || details.full_name_ar}
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
                icon="file-document"
                onPress={handleViewDocuments}
                style={styles.actionButton}
              >
                {isRTL ? 'المستندات' : 'Documents'}
              </Button>
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
            <Icon name="clipboard-check" size={24} color={theme.colors.primary} />
            <Text variant="headlineSmall">{details.inspection_count}</Text>
            <Text variant="bodySmall">{isRTL ? 'عمليات التفتيش' : 'Inspections'}</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={1}>
            <Icon name="alert" size={24} color={theme.colors.error} />
            <Text variant="headlineSmall">{details.violation_count}</Text>
            <Text variant="bodySmall">{isRTL ? 'المخالفات' : 'Violations'}</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={1}>
            <Icon name="briefcase" size={24} color={theme.colors.primary} />
            <Text variant="headlineSmall">{details.years_experience}</Text>
            <Text variant="bodySmall">{isRTL ? 'سنوات الخبرة' : 'Years Exp.'}</Text>
          </Surface>
        </View>

        {/* Personal Information */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'المعلومات الشخصية' : 'Personal Information'}
            left={(props) => <Icon {...props} name="account" />}
          />
          <Card.Content>
            <DataTable>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'رقم الهوية' : 'National ID'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.national_id}</Text></DataTable.Cell>
              </DataTable.Row>
              {details.passport_number && (
                <DataTable.Row>
                  <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'رقم الجواز' : 'Passport'}</Text></DataTable.Cell>
                  <DataTable.Cell><Text>{details.passport_number}</Text></DataTable.Cell>
                </DataTable.Row>
              )}
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'تاريخ الميلاد' : 'Date of Birth'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{new Date(details.date_of_birth).toLocaleDateString()}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'الجنس' : 'Gender'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{getGenderLabel(details.gender)}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'الحالة الاجتماعية' : 'Marital Status'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{getMaritalLabel(details.marital_status)}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'الجنسية' : 'Nationality'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.nationality}</Text></DataTable.Cell>
              </DataTable.Row>
            </DataTable>
          </Card.Content>
        </Card>

        {/* Professional Information */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'المعلومات المهنية' : 'Professional Information'}
            left={(props) => <Icon {...props} name="briefcase" />}
          />
          <Card.Content>
            <DataTable>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'المهنة' : 'Profession'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.profession}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'التخصص' : 'Specialization'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.specialization}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'المؤهل' : 'Qualification'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.qualification}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'سنوات الخبرة' : 'Years of Experience'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.years_experience}</Text></DataTable.Cell>
              </DataTable.Row>
            </DataTable>
          </Card.Content>
        </Card>

        {/* Employment Information */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'معلومات العمل' : 'Employment Information'}
            left={(props) => <Icon {...props} name="domain" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'صاحب العمل' : 'Employer'}
              description={details.employer_name}
              left={(props) => <List.Icon {...props} icon="domain" />}
              onPress={() => handleViewEmployer(details.employer_id)}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
            <Divider />
            <DataTable>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'نوع العقد' : 'Contract Type'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{getContractLabel(details.contract_type)}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'تاريخ بدء العقد' : 'Contract Start'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{new Date(details.contract_start_date).toLocaleDateString()}</Text></DataTable.Cell>
              </DataTable.Row>
              {details.contract_end_date && (
                <DataTable.Row>
                  <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'تاريخ انتهاء العقد' : 'Contract End'}</Text></DataTable.Cell>
                  <DataTable.Cell><Text>{new Date(details.contract_end_date).toLocaleDateString()}</Text></DataTable.Cell>
                </DataTable.Row>
              )}
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'الراتب الشهري' : 'Monthly Salary'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.monthly_salary.toLocaleString()} {details.currency}</Text></DataTable.Cell>
              </DataTable.Row>
            </DataTable>
          </Card.Content>
        </Card>

        {/* Work Permits */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'تصاريح العمل' : 'Work Permits'}
            left={(props) => <Icon {...props} name="card-account-details" />}
          />
          <Card.Content>
            <DataTable>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'رقم تصريح العمل' : 'Work Permit No.'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.work_permit_number}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'تاريخ انتهاء التصريح' : 'Permit Expiry'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{new Date(details.work_permit_expiry).toLocaleDateString()}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'رقم التأمين' : 'Insurance No.'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.insurance_number}</Text></DataTable.Cell>
              </DataTable.Row>
            </DataTable>
          </Card.Content>
        </Card>

        {/* Location Details */}
        <Card style={styles.sectionCard}>
          <Card.Title
            title={isRTL ? 'الموقع' : 'Location'}
            left={(props) => <Icon {...props} name="map-marker" />}
          />
          <Card.Content>
            <DataTable>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'المحافظة' : 'Governorate'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.governorate}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'المنطقة' : 'District'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.district}</Text></DataTable.Cell>
              </DataTable.Row>
              <DataTable.Row>
                <DataTable.Cell><Text variant="labelMedium">{isRTL ? 'العنوان' : 'Address'}</Text></DataTable.Cell>
                <DataTable.Cell><Text>{details.address}</Text></DataTable.Cell>
              </DataTable.Row>
            </DataTable>
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
            {details.bank_name && (
              <>
                <Divider />
                <List.Item
                  title={isRTL ? 'البنك' : 'Bank'}
                  description={`${details.bank_name} - ${details.bank_account}`}
                  left={(props) => <List.Icon {...props} icon="bank" />}
                />
              </>
            )}
          </Card.Content>
        </Card>
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
  workerName: {
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
