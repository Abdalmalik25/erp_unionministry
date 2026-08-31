/**
 * Workers Screen - List of workers with search and filters
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
  Avatar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchWorkers, selectWorkers } from '../../store/slices/workersSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Worker {
  id: string;
  full_name_ar: string;
  full_name_en: string;
  national_id: string;
  profession: string;
  employer_name: string;
  employer_id: string;
  contract_type: 'permanent' | 'temporary' | 'contractor';
  status: 'active' | 'suspended' | 'terminated';
  governorate: string;
  registration_date: string;
}

export function WorkersScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const { workers, loading, error } = useAppSelector((state) => state.workers);
  const { language } = useAppSelector((state) => state.settings);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedGovernorate, setSelectedGovernorate] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedContractType, setSelectedContractType] = useState<string | null>(null);
  
  const isRTL = language === 'ar';

  const governorates = useMemo(() => [
    'Sana\'a', 'Aden', 'Taiz', 'Ibb', 'Hodeidah', 'Dhamar', 
    'Al-Mukalla', 'Seyoun', 'Ma\'rib', 'Sa\'dah', 'Amran', 'Al-Bayda'
  ], []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchWorkers());
    setRefreshing(false);
  }, [dispatch]);

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker: Worker) => {
      const matchesSearch = searchQuery === '' || 
        worker.full_name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.full_name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.national_id.includes(searchQuery);
      
      const matchesGovernorate = !selectedGovernorate || worker.governorate === selectedGovernorate;
      const matchesStatus = !selectedStatus || worker.status === selectedStatus;
      const matchesContract = !selectedContractType || worker.contract_type === selectedContractType;
      
      return matchesSearch && matchesGovernorate && matchesStatus && matchesContract;
    });
  }, [workers, searchQuery, selectedGovernorate, selectedStatus, selectedContractType]);

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

  const renderWorkerCard = ({ item }: { item: Worker }) => (
    <Card
      style={styles.card}
      onPress={() => navigation.navigate('WorkerDetail', { workerId: item.id })}
      mode="elevated"
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.workerInfo}>
            <Avatar.Text
              size={48}
              label={item.full_name_ar.substring(0, 2)}
              style={{ backgroundColor: theme.colors.primaryContainer }}
            />
            <View style={styles.workerDetails}>
              <Text variant="titleMedium" style={styles.workerName}>
                {isRTL ? item.full_name_ar : item.full_name_en || item.full_name_ar}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.national_id}
              </Text>
            </View>
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
            <Icon name="briefcase" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {item.profession}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="domain" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
              {item.employer_name}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="file-document" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {getContractLabel(item.contract_type)}
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
          placeholder={isRTL ? 'البحث عن العمال...' : 'Search workers...'}
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
              setSelectedContractType(null);
              setFilterMenuVisible(false);
            }}
            title={isRTL ? 'إزالة الفلاتر' : 'Clear Filters'}
            leadingIcon="filter-off"
          />
          <Divider />
          <Menu.SubHeader>{isRTL ? 'الحالة' : 'Status'}</Menu.SubHeader>
          {['active', 'suspended', 'terminated'].map((status) => (
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
          <Menu.SubHeader>{isRTL ? 'نوع العقد' : 'Contract Type'}</Menu.SubHeader>
          {['permanent', 'temporary', 'contractor'].map((type) => (
            <Menu.Item
              key={type}
              onPress={() => {
                setSelectedContractType(selectedContractType === type ? null : type);
                setFilterMenuVisible(false);
              }}
              title={getContractLabel(type)}
              leadingIcon={selectedContractType === type ? 'check' : undefined}
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
      
      {(selectedGovernorate || selectedStatus || selectedContractType) && (
        <View style={styles.activeFilters}>
          {selectedStatus && (
            <Chip
              onClose={() => setSelectedStatus(null)}
              style={styles.filterChip}
            >
              {getStatusLabel(selectedStatus)}
            </Chip>
          )}
          {selectedContractType && (
            <Chip
              onClose={() => setSelectedContractType(null)}
              style={styles.filterChip}
            >
              {getContractLabel(selectedContractType)}
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
        {filteredWorkers.length} {isRTL ? 'نتيجة' : 'results'}
      </Text>
    </View>
  );

  if (loading && workers.length === 0) {
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
        data={filteredWorkers}
        renderItem={renderWorkerCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-off" size={64} color={theme.colors.outline} />
            <Text variant="bodyLarge" style={styles.emptyText}>
              {isRTL ? 'لا توجد نتائج' : 'No workers found'}
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
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  workerDetails: {
    flex: 1,
  },
  workerName: {
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
