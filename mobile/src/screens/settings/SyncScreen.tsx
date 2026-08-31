/**
 * Sync Screen - Monitor and manage data synchronization
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Card,
  Button,
  IconButton,
  List,
  Divider,
  ActivityIndicator,
  ProgressBar,
  Chip,
  Banner,
  Snackbar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  startSync,
  selectSyncStatus,
  selectSyncProgress,
  selectPendingItems,
  selectLastSyncTime,
  selectSyncErrors,
} from '../../store/slices/syncSlice';
import { selectIsConnected } from '../../store/slices/offlineSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SyncItem {
  id: string;
  type: 'inspection' | 'violation' | 'document' | 'photo';
  name: string;
  created_at: string;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  error?: string;
  size?: number;
}

export function SyncScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const { language } = useAppSelector((state) => state.settings);
  const syncStatus = useAppSelector(selectSyncStatus);
  const syncProgress = useAppSelector(selectSyncProgress);
  const pendingItems = useAppSelector(selectPendingItems);
  const lastSyncTime = useAppSelector(selectLastSyncTime);
  const syncErrors = useAppSelector(selectSyncErrors);
  const isConnected = useAppSelector(selectIsConnected);
  
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [autoSync, setAutoSync] = useState(true);
  const [syncOverWifiOnly, setSyncOverWifiOnly] = useState(false);
  
  // Mock sync queue for demo
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([
    {
      id: '1',
      type: 'inspection',
      name: 'Inspection #1234',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      status: 'pending',
      size: 2400,
    },
    {
      id: '2',
      type: 'violation',
      name: 'Violation: No Safety Equipment',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      status: 'pending',
      size: 1500,
    },
    {
      id: '3',
      type: 'photo',
      name: 'Evidence Photo 1',
      created_at: new Date(Date.now() - 10800000).toISOString(),
      status: 'pending',
      size: 2400000,
    },
    {
      id: '4',
      type: 'document',
      name: 'Work Permit Scan',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      status: 'synced',
    },
  ]);
  
  const isRTL = language === 'ar';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reload sync status
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleStartSync = async () => {
    if (!isConnected) {
      Alert.alert(
        isRTL ? 'لا يوجد اتصال' : 'No Connection',
        isRTL ? 'لا يمكن المزامنة بدون اتصال بالإنترنت' : 'Cannot sync without internet connection'
      );
      return;
    }
    
    if (syncStatus === 'syncing') {
      return;
    }
    
    try {
      // Update items to syncing
      setSyncQueue((prev) =>
        prev.map((item) =>
          item.status === 'pending' ? { ...item, status: 'syncing' } : item
        )
      );
      
      // Dispatch sync action
      await dispatch(startSync({
        autoSync,
        wifiOnly: syncOverWifiOnly,
      }));
      
      // Update items to synced
      setSyncQueue((prev) =>
        prev.map((item) =>
          item.status === 'syncing' ? { ...item, status: 'synced' } : item
        )
      );
      
      setSnackbarMessage(
        isRTL ? 'تمت المزامنة بنجاح' : 'Sync completed successfully'
      );
      setSnackbarVisible(true);
    } catch (error) {
      setSnackbarMessage(
        isRTL ? 'فشلت المزامنة' : 'Sync failed'
      );
      setSnackbarVisible(true);
    }
  };

  const handleClearSynced = () => {
    Alert.alert(
      isRTL ? 'مسح العناصر المتزامنة' : 'Clear Synced Items',
      isRTL ? 'سيتم إزالة العناصر المتزامنة من القائمة' : 'Synced items will be removed from the list',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'مسح' : 'Clear',
          onPress: () => {
            setSyncQueue((prev) => prev.filter((item) => item.status !== 'synced'));
            setSnackbarMessage(isRTL ? 'تم المسح' : 'Cleared');
            setSnackbarVisible(true);
          },
        },
      ]
    );
  };

  const handleRetryItem = (item: SyncItem) => {
    setSyncQueue((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, status: 'pending', error: undefined } : i
      )
    );
  };

  const handleDeleteItem = (item: SyncItem) => {
    Alert.alert(
      isRTL ? 'حذف العنصر' : 'Delete Item',
      isRTL 
        ? `هل أنت متأكد من حذف "${item.name}"؟` 
        : `Are you sure you want to delete "${item.name}"?`,
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: () => {
            setSyncQueue((prev) => prev.filter((i) => i.id !== item.id));
          },
        },
      ]
    );
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'inspection': return 'clipboard-check';
      case 'violation': return 'alert';
      case 'document': return 'file-document';
      case 'photo': return 'image';
      default: return 'file';
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'inspection': return isRTL ? 'تفتيش' : 'Inspection';
      case 'violation': return isRTL ? 'مخالفة' : 'Violation';
      case 'document': return isRTL ? 'مستند' : 'Document';
      case 'photo': return isRTL ? 'صورة' : 'Photo';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'syncing': return '#2196F3';
      case 'synced': return '#4CAF50';
      case 'error': return '#F44336';
      default: return theme.colors.outline;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return isRTL ? 'قيد الانتظار' : 'Pending';
      case 'syncing': return isRTL ? 'جاري المزامنة' : 'Syncing';
      case 'synced': return isRTL ? 'متزامن' : 'Synced';
      case 'error': return isRTL ? 'خطأ' : 'Error';
      default: return status;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatRelativeTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return isRTL ? 'الآن' : 'Just now';
    if (diffMins < 60) return isRTL ? `قبل ${diffMins} دقيقة` : `${diffMins}m ago`;
    if (diffHours < 24) return isRTL ? `قبل ${diffHours} ساعة` : `${diffHours}h ago`;
    return isRTL ? `قبل ${diffDays} يوم` : `${diffDays}d ago`;
  };

  const totalPending = syncQueue.filter((i) => i.status === 'pending' || i.status === 'syncing').length;
  const totalSynced = syncQueue.filter((i) => i.status === 'synced').length;
  const totalErrors = syncQueue.filter((i) => i.status === 'error').length;

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Connection Status Banner */}
        {!isConnected && (
          <Banner
            visible
            icon="wifi-off"
            actions={[]}
            style={styles.banner}
          >
            {isRTL 
              ? 'لا يوجد اتصال بالإنترنت. البيانات ستحفظ محلياً.' 
              : 'No internet connection. Data will be saved locally.'}
          </Banner>
        )}

        {/* Sync Status Card */}
        <Card style={styles.statusCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <Icon
                  name={syncStatus === 'syncing' ? 'cloud-sync' : 
                        syncStatus === 'error' ? 'cloud-off' : 
                        isConnected ? 'cloud-check' : 'cloud-off-outline'}
                  size={32}
                  color={syncStatus === 'error' ? theme.colors.error : theme.colors.primary}
                />
                <View style={styles.statusText}>
                  <Text variant="titleLarge">
                    {syncStatus === 'syncing' 
                      ? (isRTL ? 'جاري المزامنة...' : 'Syncing...')
                      : syncStatus === 'error'
                      ? (isRTL ? 'خطأ في المزامنة' : 'Sync Error')
                      : isConnected 
                      ? (isRTL ? 'متصل' : 'Connected')
                      : (isRTL ? 'غير متصل' : 'Disconnected')}
                  </Text>
                  <Text variant="bodySmall" style={{ opacity: 0.7 }}>
                    {lastSyncTime 
                      ? `${isRTL ? 'آخر مزامنة' : 'Last sync'}: ${new Date(lastSyncTime).toLocaleString()}`
                      : (isRTL ? 'لم تتم المزامنة بعد' : 'Never synced')}
                  </Text>
                </View>
              </View>
              <Button
                mode="contained"
                onPress={handleStartSync}
                disabled={syncStatus === 'syncing' || !isConnected}
                icon={syncStatus === 'syncing' ? 'loading' : 'cloud-upload'}
              >
                {syncStatus === 'syncing' 
                  ? (isRTL ? 'جاري...' : 'Syncing...')
                  : (isRTL ? 'مزامنة الآن' : 'Sync Now')}
              </Button>
            </View>
            
            {syncStatus === 'syncing' && (
              <View style={styles.progressContainer}>
                <ProgressBar
                  progress={syncProgress}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
                <Text variant="bodySmall" style={styles.progressText}>
                  {Math.round(syncProgress * 100)}%
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Surface style={styles.statCard} elevation={1}>
            <Icon name="clock" size={24} color="#FF9800" />
            <Text variant="headlineSmall">{totalPending}</Text>
            <Text variant="bodySmall">{isRTL ? 'قيد الانتظار' : 'Pending'}</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={1}>
            <Icon name="check-circle" size={24} color="#4CAF50" />
            <Text variant="headlineSmall">{totalSynced}</Text>
            <Text variant="bodySmall">{isRTL ? 'متزامن' : 'Synced'}</Text>
          </Surface>
          <Surface style={styles.statCard} elevation={1}>
            <Icon name="alert-circle" size={24} color="#F44336" />
            <Text variant="headlineSmall">{totalErrors}</Text>
            <Text variant="bodySmall">{isRTL ? 'أخطاء' : 'Errors'}</Text>
          </Surface>
        </View>

        {/* Settings */}
        <Card style={styles.settingsCard}>
          <Card.Title
            title={isRTL ? 'إعدادات المزامنة' : 'Sync Settings'}
            left={(props) => <Icon {...props} name="cog" />}
          />
          <Card.Content>
            <List.Item
              title={isRTL ? 'المزامنة التلقائية' : 'Auto Sync'}
              description={
                isRTL 
                  ? 'مزامنة البيانات تلقائياً عند الاتصال' 
                  : 'Sync data automatically when connected'
              }
              left={(props) => <List.Icon {...props} icon="sync" />}
              right={() => (
                <Button
                  mode={autoSync ? 'flat' : 'outlined'}
                  compact
                  onPress={() => setAutoSync(!autoSync)}
                >
                  {autoSync ? (isRTL ? 'مفعّل' : 'On') : (isRTL ? 'معطّل' : 'Off')}
                </Button>
              )}
            />
            <Divider />
            <List.Item
              title={isRTL ? 'المزامنة عبر Wi-Fi فقط' : 'Wi-Fi Only Sync'}
              description={
                isRTL 
                  ? 'توفير استخدام البيانات' 
                  : 'Save mobile data'
              }
              left={(props) => <List.Icon {...props} icon="wifi" />}
              right={() => (
                <Button
                  mode={syncOverWifiOnly ? 'flat' : 'outlined'}
                  compact
                  onPress={() => setSyncOverWifiOnly(!syncOverWifiOnly)}
                >
                  {syncOverWifiOnly ? (isRTL ? 'مفعّل' : 'On') : (isRTL ? 'معطّل' : 'Off')}
                </Button>
              )}
            />
          </Card.Content>
        </Card>

        {/* Sync Queue */}
        <Card style={styles.queueCard}>
          <Card.Title
            title={isRTL ? 'قائمة المزامنة' : 'Sync Queue'}
            subtitle={`${syncQueue.length} ${isRTL ? 'عنصر' : 'items'}`}
            left={(props) => <Icon {...props} name="format-list-bulleted" />}
            right={() => (
              <IconButton
                icon="broom"
                onPress={handleClearSynced}
                disabled={totalSynced === 0}
              />
            )}
          />
          <Card.Content style={styles.queueContent}>
            {syncQueue.length === 0 ? (
              <View style={styles.emptyQueue}>
                <Icon name="check-circle-outline" size={48} color={theme.colors.outline} />
                <Text variant="bodyMedium" style={styles.emptyText}>
                  {isRTL ? 'لا توجد عناصر في قائمة المزامنة' : 'Sync queue is empty'}
                </Text>
              </View>
            ) : (
              syncQueue.map((item) => (
                <View key={item.id} style={styles.queueItem}>
                  <View style={styles.queueItemIcon}>
                    <Icon
                      name={getItemIcon(item.type)}
                      size={24}
                      color={getStatusColor(item.status)}
                    />
                  </View>
                  <View style={styles.queueItemInfo}>
                    <Text variant="bodyMedium" style={styles.queueItemName}>
                      {item.name}
                    </Text>
                    <View style={styles.queueItemMeta}>
                      <Chip
                        mode="flat"
                        compact
                        style={[
                          styles.typeChip,
                          { backgroundColor: getStatusColor(item.status) + '20' },
                        ]}
                        textStyle={{ color: getStatusColor(item.status), fontSize: 10 }}
                      >
                        {getStatusLabel(item.status)}
                      </Chip>
                      <Text variant="bodySmall" style={styles.queueItemTime}>
                        {formatRelativeTime(item.created_at)}
                      </Text>
                      {item.size && (
                        <Text variant="bodySmall" style={styles.queueItemSize}>
                          {formatFileSize(item.size)}
                        </Text>
                      )}
                    </View>
                    {item.error && (
                      <Text variant="bodySmall" style={styles.errorText}>
                        {item.error}
                      </Text>
                    )}
                  </View>
                  <View style={styles.queueItemActions}>
                    {item.status === 'pending' && (
                      <IconButton
                        icon="refresh"
                        size={20}
                        onPress={() => handleRetryItem(item)}
                      />
                    )}
                    {item.status === 'syncing' && (
                      <ActivityIndicator size="small" />
                    )}
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      onPress={() => handleDeleteItem(item)}
                    />
                  </View>
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Storage Info */}
        <Card style={styles.storageCard}>
          <Card.Title
            title={isRTL ? 'معلومات التخزين' : 'Storage Information'}
            left={(props) => <Icon {...props} name="harddisk" />}
          />
          <Card.Content>
            <View style={styles.storageRow}>
              <Text variant="bodyMedium">
                {isRTL ? 'التخزين المحلي' : 'Local Storage'}
              </Text>
              <Text variant="bodyMedium" style={styles.storageValue}>
                {isRTL ? '128 MB / 500 MB' : '128 MB / 500 MB'}
              </Text>
            </View>
            <ProgressBar
              progress={0.256}
              color={theme.colors.primary}
              style={styles.storageBar}
            />
            <View style={styles.storageBreakdown}>
              <View style={styles.storageItem}>
                <Icon name="image" size={16} color={theme.colors.primary} />
                <Text variant="bodySmall">
                  {isRTL ? 'الصور: 85 MB' : 'Photos: 85 MB'}
                </Text>
              </View>
              <View style={styles.storageItem}>
                <Icon name="file-document" size={16} color={theme.colors.secondary} />
                <Text variant="bodySmall">
                  {isRTL ? 'المستندات: 32 MB' : 'Documents: 32 MB'}
                </Text>
              </View>
              <View style={styles.storageItem}>
                <Icon name="database" size={16} color={theme.colors.tertiary} />
                <Text variant="bodySmall">
                  {isRTL ? 'البيانات: 11 MB' : 'Data: 11 MB'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
  banner: {
    marginBottom: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  statusText: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    minWidth: 40,
    textAlign: 'right',
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
  settingsCard: {
    marginBottom: 16,
  },
  queueCard: {
    marginBottom: 16,
  },
  queueContent: {
    paddingTop: 0,
  },
  emptyQueue: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 8,
    opacity: 0.7,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  queueItemIcon: {
    marginRight: 12,
  },
  queueItemInfo: {
    flex: 1,
  },
  queueItemName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  queueItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    height: 20,
  },
  queueItemTime: {
    opacity: 0.7,
  },
  queueItemSize: {
    opacity: 0.7,
  },
  errorText: {
    color: '#F44336',
    marginTop: 4,
  },
  queueItemActions: {
    flexDirection: 'row',
  },
  storageCard: {
    marginBottom: 16,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storageValue: {
    fontWeight: '600',
  },
  storageBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  storageBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
