/**
 * Employers Screen - List of employers with search and filters
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import {
  Searchbar,
  Card,
  Text,
  Chip,
  ActivityIndicator,
  useTheme,
  IconButton,
  Menu,
  Divider,
  Surface,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchEmployers, selectEmployers } from '../../store/slices/employersSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Employer {
  id: string;
  name_ar: string;
  name_en: string;
  registration_number: string;
  economic_activity: string;
  employee_count: number;
  governorate: string;
  status: 'active' | 'suspended' | 'pending';
}

export function EmployersScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const { employers, loading, error } = useAppSelector((state) => state.employers);
  const { language } = useAppSelector((state) => state.settings);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  
  const isRTL = language === 'ar';

  const governorates = useMemo(() => [
    'Sana\'a', 'Aden', 'Taiz', 'Ibb', 'Hodeidah', 'Dhamar', 
    'Al-Mukalla', 'Seyoun', 'Ma'rib', 'Sa'dah', 'Amran', 'Al-Bayda'
  ], []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEmployers());
    setRefreshing(false);
  }, [dispatch]);

  const filteredEmployers = useMemo(() => {
    return employers.filter((employer: Employer) => {
      const matchesSearch = searchQuery === '' || 
        employer.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employer.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employer.registration_number.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGovernorate = !selectedGovernorate || employer.governorate === selectedGovernorate;
      const matchesStatus = !selectedStatus || employer.status === selectedStatus;
      
      return matchesSearch && matchesGovernorate && matchesStatus;
    });
  }, [employers, searchQuery, selectedGovernorate, selectedStatus]);

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

  const renderEmployerCard = ({ item }: { item: Employer }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('EmployerDetail', { employerId: item.id })}
      mode="elevated"
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text variant="titleMedium" style={styles.employerName}>
              {isRTL ? item.name_ar : item.name_en || item.name_ar}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {item.registration_number}
            </Text>
          </View>
          <Chip
            mode="flat"
            style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
            textStyle={{ color: getStatusColor(item.status), fontSize: 11 }}
          >
            {getStatusLabel(item.status)}
          </Chip>
        </View>
        
        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Icon name="account-group" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {item.employee_count} {isRTL ? 'عامل' : 'workers'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {item.governorate}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="domain" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
              {item.economic_activity}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={isRTL ? 'البحث عن أصحاب العمل...' : 'Search employers...'}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={isRTL ? { textAlign: 'right' } : {}}
        />
        <Menu
          visible={filterMenuVisible}
          onDismiss={() => setFilterMenuVisible(false)}
          anchor={
            <IconButton
              icon="filter-variant"
              mode="contained"
              onPress={() => setFilterMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setSelectedGovernorate(null);
              setSelectedStatus(null);
              setFilterMenuVisible(false);
            }}
            title={isRTL ? 'إزالة الفلاتر' : 'Clear Filters'}
            leadingIcon="filter-off"
          />
          <Divider />
          <Menu.SubHeader>{isRTL ? 'الحالة' : 'Status'}</Menu.SubHeader>
          {['active', 'suspended', 'pending'].map((status) => (
            <Menu.Item
              key={status}
              onPress={() => {
                setSelectedStatus(selectedStatus === status ? null : status);
                setFilterMenuVisible(false);
              }}
              title={getStatusLabel(status)}
              leadingIcon={selectedStatus === status ? 'check' : undefined}
            />
          ))}
          <Divider />
          <Menu.SubHeader>{isRTL ? 'المحافظة' : 'Governorate'}</Menu.SubHeader>
          {governorates.map((gov) => (
            <Menu.Item
              key={gov}
              onPress={() => {
                setSelectedGovernorate(selectedGovernorate === gov ? null : gov);
                setFilterMenuVisible(false);
              }}
              title={gov}
              leadingIcon={selectedGovernorate === gov ? 'check' : undefined}
            />
          ))}
        </Menu>
      </View>
      
      {(selectedGovernorate || selectedStatus) && (
        <View style={styles.activeFilters}>
          {selectedStatus && (
            <Chip
              onClose={() => setSelectedStatus(null)}
              style={styles.filterChip}
            >
              {getStatusLabel(selectedStatus)}
            </Chip>
          )}
          {selectedGovernorate && (
            <Chip
              onClose={() => setSelectedGovernorate(null)}
              style={styles.filterChip}
            >
              {selectedGovernorate}
            </Chip>
          )}
        </View>
      )}
      
      <Text variant="bodySmall" style={styles.resultCount}>
        {filteredEmployers.length} {isRTL ? 'نتيجة' : 'results'}
      </Text>
    </View>
  );

  if (loading && employers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>
          {isRTL ? 'جاري التحميل...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={filteredEmployers}
        renderItem={renderEmployerCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="domain-off" size={64} color={theme.colors.outline} />
            <Text variant="bodyLarge" style={styles.emptyText}>
              {isRTL ? 'لا توجد نتائج' : 'No employers found'}
            </Text>
          </View>
        }
      />
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
  },
  loadingText: {
    marginTop: 16,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchbar: {
    flex: 1,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  filterChip: {
    height: 28,
  },
  resultCount: {
    marginTop: 12,
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  employerName: {
    fontWeight: '600',
  },
  statusChip: {
    height: 24,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    opacity: 0.7,
  },
});
