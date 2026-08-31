/**
 * Dashboard Screen - Inspector Home
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, useTheme, Surface, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../hooks/useAppSelector';
import { selectUser } from '../../store/slices/authSlice';
import { fetchInspections, selectInspections } from '../../store/slices/inspectionsSlice';
import { getApiClient } from '../../api/client';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const theme = useTheme();
  return (
    <Surface style={[styles.statCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <Icon name={icon} size={28} color={color} />
      <Text variant="headlineMedium" style={[styles.statValue, { color }]}>
        {value}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {title}
      </Text>
    </Surface>
  );
}

export function DashboardScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const user = useAppSelector(selectUser);
  const inspections = useAppSelector(selectInspections);

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh data
    setRefreshing(false);
  };

  // Mock stats - in real app, fetch from API
  const stats = {
    todaysInspections: 3,
    pendingInspections: 7,
    completedThisMonth: 45,
    activeWorkers: 1250,
    violationsReported: 12,
    complianceRate: '87%',
  };

  const pendingInspections = inspections.filter(i => i.status === 'scheduled');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.primary }]} elevation={0}>
        <Text variant="headlineSmall" style={styles.welcomeText}>
          {t('dashboard.welcomeBack', { name: user?.name || 'Inspector' })}
        </Text>
        <Text variant="bodyMedium" style={styles.dateText}>
          {new Date().toLocaleDateString('ar-YE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </Surface>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title={t('dashboard.todaysInspections')}
            value={stats.todaysInspections}
            icon="clipboard-check"
            color={theme.colors.primary}
          />
          <StatCard
            title={t('dashboard.pendingInspections')}
            value={stats.pendingInspections}
            icon="clock-outline"
            color={theme.colors.tertiary}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            title={t('dashboard.completedThisMonth')}
            value={stats.completedThisMonth}
            icon="check-circle"
            color={theme.colors.secondary}
          />
          <StatCard
            title={t('dashboard.activeWorkers')}
            value={stats.activeWorkers}
            icon="account-group"
            color="#059669"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <Surface style={styles.section} elevation={0}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Quick Actions
        </Text>
        <View style={styles.quickActions}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => {}}
            style={styles.actionButton}
          >
            {t('inspections.newInspection')}
          </Button>
          <Button
            mode="outlined"
            icon="camera"
            onPress={() => {}}
            style={styles.actionButton}
          >
            Scan QR
          </Button>
        </View>
      </Surface>

      {/* Pending Inspections List */}
      <Surface style={styles.section} elevation={0}>
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('dashboard.pendingInspections')}
          </Text>
          <Button mode="text" compact onPress={() => {}}>
            View All
          </Button>
        </View>

        {pendingInspections.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                No pending inspections
              </Text>
            </Card.Content>
          </Card>
        ) : (
          pendingInspections.map((inspection) => (
            <Card key={inspection.id} style={styles.inspectionCard} mode="outlined">
              <Card.Content>
                <View style={styles.inspectionHeader}>
                  <Text variant="titleSmall">{inspection.employerName}</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
                    {inspection.type}
                  </Text>
                </View>
                <View style={styles.inspectionDetails}>
                  <Icon name="calendar" size={16} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodySmall" style={{ marginLeft: 4 }}>
                    {new Date(inspection.scheduledDate).toLocaleDateString()}
                  </Text>
                  {inspection.location && (
                    <>
                      <Icon name="map-marker" size={16} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 12 }} />
                      <Text variant="bodySmall" style={{ marginLeft: 4 }}>
                        {inspection.location}
                      </Text>
                    </>
                  )}
                </View>
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="text"
                  onPress={() => {}}
                >
                  Start
                </Button>
              </Card.Actions>
            </Card>
          ))
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  welcomeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  dateText: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsGrid: {
    padding: 16,
    marginTop: -16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  emptyCard: {
    marginTop: 8,
  },
  inspectionCard: {
    marginBottom: 12,
  },
  inspectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inspectionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});