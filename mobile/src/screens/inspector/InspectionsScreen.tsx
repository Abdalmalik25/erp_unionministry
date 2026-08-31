/**
 * Inspections List Screen
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Chip, Searchbar, useTheme, FAB, Menu, IconButton, SegmentedButtons } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../hooks/useAppSelector';
import { selectInspections } from '../../store/slices/inspectionsSlice';

type FilterStatus = 'all' | 'scheduled' | 'in_progress' | 'completed';

export function InspectionsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const inspections = useAppSelector(selectInspections);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = inspection.employerName
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' || inspection.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return theme.colors.primary;
      case 'in_progress':
        return theme.colors.tertiary;
      case 'completed':
        return theme.colors.secondary;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.onSurface;
    }
  };

  const renderInspectionItem = ({ item }: { item: any }) => (
    <Card
      style={styles.card}
      mode="outlined"
      onPress={() => {}}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text variant="titleMedium">{item.employerName}</Text>
            <Chip
              compact
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={{ color: getStatusColor(item.status), fontSize: 11 }}
            >
              {item.status.replace('_', ' ')}
            </Chip>
          </View>
          <IconButton
            icon="chevron-right"
            size={24}
            onPress={() => {}}
          />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Icon name="tag" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {item.type.replace('_', ' ')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={16} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.detailText}>
              {new Date(item.scheduledDate).toLocaleDateString()}
            </Text>
          </View>
          {item.location && (
            <View style={styles.detailRow}>
              <Icon name="map-marker" size={16} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={styles.detailText} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
        </View>

        {item.violations && item.violations.length > 0 && (
          <View style={styles.violationsBadge}>
            <Icon name="alert-circle" size={14} color={theme.colors.error} />
            <Text variant="labelSmall" style={{ color: theme.colors.error, marginLeft: 4 }}>
              {item.violations.length} violations
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t('common.search')}
          value={search}
          onChangeText={setSearch}
          style={styles.searchbar}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filterStatus}
          onValueChange={(value) => setFilterStatus(value as FilterStatus)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'in_progress', label: 'Active' },
            { value: 'completed', label: 'Done' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* List */}
      <FlatList
        data={filteredInspections}
        renderItem={renderInspectionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="clipboard-search-outline" size={64} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16 }}>
              No inspections found
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {}}
        color="white"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 0,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  segmentedButtons: {
    // Styles
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  statusChip: {
    height: 24,
  },
  cardDetails: {
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 8,
  },
  violationsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});