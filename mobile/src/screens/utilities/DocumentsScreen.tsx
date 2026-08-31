/**
 * Documents Screen - View and manage worker/employer documents
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Card,
  Chip,
  IconButton,
  Searchbar,
  FAB,
  ActivityIndicator,
  Divider,
  Menu,
  Button,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAppSelector } from '../../hooks/useAppSelector';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type RouteProps = RouteProp<RootStackParamList, 'Documents'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Document {
  id: string;
  name_ar: string;
  name_en: string;
  type: 'contract' | 'license' | 'certificate' | 'report' | 'identity' | 'other';
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  expiry_date?: string;
  status: 'valid' | 'expired' | 'pending';
}

export function DocumentsScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  
  const { workerId } = route.params || {};
  const { language } = useAppSelector((state) => state.settings);
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState<string | null>(null);
  
  const isRTL = language === 'ar';

  // Mock data for demo
  useEffect(() => {
    const mockDocuments: Document[] = [
      {
        id: '1',
        name_ar: 'عقد العمل',
        name_en: 'Employment Contract',
        type: 'contract',
        file_url: 'https://example.com/contract.pdf',
        file_size: 245000,
        mime_type: 'application/pdf',
        uploaded_at: '2024-01-15',
        expiry_date: '2025-01-15',
        status: 'valid',
      },
      {
        id: '2',
        name_ar: 'رخصة العمل',
        name_en: 'Work Permit',
        type: 'license',
        file_url: 'https://example.com/license.pdf',
        file_size: 180000,
        mime_type: 'application/pdf',
        uploaded_at: '2024-01-10',
        expiry_date: '2025-01-10',
        status: 'valid',
      },
      {
        id: '3',
        name_ar: 'شهادة التأهيل المهني',
        name_en: 'Professional Qualification Certificate',
        type: 'certificate',
        file_url: 'https://example.com/cert.pdf',
        file_size: 320000,
        mime_type: 'application/pdf',
        uploaded_at: '2023-06-20',
        status: 'valid',
      },
      {
        id: '4',
        name_ar: 'تقرير الفحص الطبي',
        name_en: 'Medical Examination Report',
        type: 'report',
        file_url: 'https://example.com/medical.pdf',
        file_size: 450000,
        mime_type: 'application/pdf',
        uploaded_at: '2023-12-01',
        status: 'valid',
      },
      {
        id: '5',
        name_ar: 'صورة هوية',
        name_en: 'ID Photo',
        type: 'identity',
        file_url: 'https://example.com/id.jpg',
        file_size: 120000,
        mime_type: 'image/jpeg',
        uploaded_at: '2024-01-05',
        status: 'valid',
      },
    ];
    
    setDocuments(mockDocuments);
    setLoading(false);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Would fetch documents from API
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = searchQuery === '' ||
      doc.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.name_en.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'contract': return 'file-document';
      case 'license': return 'certificate';
      case 'certificate': return 'school';
      case 'report': return 'file-chart';
      case 'identity': return 'card-account-details';
      default: return 'file';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'contract': return isRTL ? 'عقد' : 'Contract';
      case 'license': return isRTL ? 'رخصة' : 'License';
      case 'certificate': return isRTL ? 'شهادة' : 'Certificate';
      case 'report': return isRTL ? 'تقرير' : 'Report';
      case 'identity': return isRTL ? 'هوية' : 'Identity';
      default: return isRTL ? 'أخرى' : 'Other';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return '#4CAF50';
      case 'expired': return '#F44336';
      case 'pending': return '#FF9800';
      default: return theme.colors.outline;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'valid': return isRTL ? 'صالح' : 'Valid';
      case 'expired': return isRTL ? 'منتهي' : 'Expired';
      case 'pending': return isRTL ? 'قيد الانتظار' : 'Pending';
      default: return status;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleViewDocument = async (doc: Document) => {
    try {
      // In production, would download and open the file
      Alert.alert(
        isRTL ? 'عرض المستند' : 'View Document',
        isRTL ? `جاري فتح ${doc.name_ar}` : `Opening ${doc.name_en}`
      );
    } catch (error) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'فشل فتح المستند' : 'Failed to open document'
      );
    }
  };

  const handleShareDocument = async (doc: Document) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // In production, would share the file
        Alert.alert(
          isRTL ? 'مشاركة' : 'Share',
          isRTL ? `جاري مشاركة ${doc.name_ar}` : `Sharing ${doc.name_en}`
        );
      }
    } catch (error) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'فشل مشاركة المستند' : 'Failed to share document'
      );
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      Alert.alert(
        isRTL ? 'تحميل' : 'Download',
        isRTL ? `جاري تحميل ${doc.name_ar}` : `Downloading ${doc.name_en}`
      );
    } catch (error) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'فشل تحميل المستند' : 'Failed to download document'
      );
    }
  };

  const renderDocument = ({ item }: { item: Document }) => (
    <Card style={styles.documentCard} mode="elevated">
      <Card.Content>
        <View style={styles.documentHeader}>
          <View style={styles.documentIcon}>
            <Icon
              name={getDocumentIcon(item.type)}
              size={32}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.documentInfo}>
            <Text variant="titleMedium" style={styles.documentName}>
              {isRTL ? item.name_ar : item.name_en}
            </Text>
            <View style={styles.documentMeta}>
              <Chip
                mode="flat"
                compact
                style={styles.typeChip}
              >
                {getTypeLabel(item.type)}
              </Chip>
              <Text variant="bodySmall" style={styles.fileSize}>
                {formatFileSize(item.file_size)}
              </Text>
            </View>
          </View>
          <View style={styles.documentActions}>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={{ color: getStatusColor(item.status), fontSize: 11 }}
            >
              {getStatusLabel(item.status)}
            </Chip>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(item.id)}
                />
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null);
                  handleViewDocument(item);
                }}
                title={isRTL ? 'عرض' : 'View'}
                leadingIcon="eye"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null);
                  handleDownloadDocument(item);
                }}
                title={isRTL ? 'تحميل' : 'Download'}
                leadingIcon="download"
              />
              <Menu.Item
                onPress={() => {
                  setMenuVisible(null);
                  handleShareDocument(item);
                }}
                title={isRTL ? 'مشاركة' : 'Share'}
                leadingIcon="share-variant"
              />
            </Menu>
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.documentFooter}>
          <View style={styles.footerItem}>
            <Icon name="calendar" size={14} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.footerText}>
              {isRTL ? 'تاريخ الرفع' : 'Uploaded'}: {new Date(item.uploaded_at).toLocaleDateString()}
            </Text>
          </View>
          {item.expiry_date && (
            <View style={styles.footerItem}>
              <Icon name="calendar-alert" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={styles.footerText}>
                {isRTL ? 'ينتهي' : 'Expires'}: {new Date(item.expiry_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search and Filter */}
      <View style={styles.header}>
        <Searchbar
          placeholder={isRTL ? 'البحث في المستندات...' : 'Search documents...'}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={isRTL ? { textAlign: 'right' } : {}}
        />
        
        {/* Type Filters */}
        <View style={styles.filterRow}>
          <Chip
            mode={selectedType === null ? 'flat' : 'outlined'}
            selected={selectedType === null}
            onPress={() => setSelectedType(null)}
            style={styles.filterChip}
          >
            {isRTL ? 'الكل' : 'All'}
          </Chip>
          {['contract', 'license', 'certificate', 'report', 'identity'].map((type) => (
            <Chip
              key={type}
              mode={selectedType === type ? 'flat' : 'outlined'}
              selected={selectedType === type}
              onPress={() => setSelectedType(selectedType === type ? null : type)}
              style={styles.filterChip}
            >
              {getTypeLabel(type)}
            </Chip>
          ))}
        </View>
        
        <Text variant="bodySmall" style={styles.resultCount}>
          {filteredDocuments.length} {isRTL ? 'مستند' : 'documents'}
        </Text>
      </View>
      
      {/* Documents List */}
      <FlatList
        data={filteredDocuments}
        renderItem={renderDocument}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={64} color={theme.colors.outline} />
            <Text variant="bodyLarge" style={styles.emptyText}>
              {isRTL ? 'لا توجد مستندات' : 'No documents found'}
            </Text>
          </View>
        }
      />
      
      {/* Add Document FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          Alert.alert(
            isRTL ? 'إضافة مستند' : 'Add Document',
            isRTL ? 'اختر طريقة إضافة المستند' : 'Choose how to add document',
            [
              { text: isRTL ? 'مسح ضوئي' : 'Scan', onPress: () => {} },
              { text: isRTL ? 'اختيار من الملفات' : 'Choose File', onPress: () => {} },
              { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
            ]
          );
        }}
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
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    height: 32,
  },
  resultCount: {
    marginTop: 12,
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  documentCard: {
    marginBottom: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeChip: {
    height: 24,
  },
  fileSize: {
    opacity: 0.7,
  },
  documentActions: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 24,
    marginBottom: 4,
  },
  divider: {
    marginVertical: 12,
  },
  documentFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    opacity: 0.7,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
