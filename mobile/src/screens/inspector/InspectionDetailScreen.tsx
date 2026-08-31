/**
 * Inspection Detail Screen
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, useTheme, Divider, List, Chip } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentInspection } from '../../store/slices/inspectionsSlice';

export function InspectionDetailScreen({ route }: any) {
  const theme = useTheme();
  const { t } = useTranslation();
  const inspection = useAppSelector(selectCurrentInspection);

  if (!inspection) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Inspection not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <Text variant="headlineSmall" style={styles.employerName}>
              {inspection.employerName}
            </Text>
            <Chip
              style={[styles.statusChip, { backgroundColor: theme.colors.primary + '20' }]}
              textStyle={{ color: theme.colors.primary }}
            >
              {inspection.status.replace('_', ' ')}
            </Chip>
          </View>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {inspection.type.replace('_', ' ')} Inspection
          </Text>
        </Card.Content>
      </Card>

      {/* Details Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Details
          </Text>
          <List.Item
            title="Scheduled Date"
            description={new Date(inspection.scheduledDate).toLocaleDateString()}
            left={(props) => <List.Icon {...props} icon="calendar" />}
          />
          <Divider />
          {inspection.actualDate && (
            <>
              <List.Item
                title="Actual Date"
                description={new Date(inspection.actualDate).toLocaleDateString()}
                left={(props) => <List.Icon {...props} icon="calendar-check" />}
              />
              <Divider />
            </>
          )}
          {inspection.location && (
            <>
              <List.Item
                title="Location"
                description={inspection.location}
                left={(props) => <List.Icon {...props} icon="map-marker" />}
              />
              <Divider />
            </>
          )}
          {inspection.inspectorNotes && (
            <>
              <List.Item
                title="Inspector Notes"
                description={inspection.inspectorNotes}
                left={(props) => <List.Icon {...props} icon="note-text" />}
              />
              <Divider />
            </>
          )}
        </Card.Content>
      </Card>

      {/* Violations */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Violations ({inspection.violations?.length || 0})
            </Text>
            <Button
              mode="contained-tonal"
              icon="plus"
              compact
              onPress={() => {}}
            >
              Add
            </Button>
          </View>

          {inspection.violations && inspection.violations.length > 0 ? (
            inspection.violations.map((violation, index) => (
              <View key={violation.id || index} style={styles.violationItem}>
                <View style={styles.violationHeader}>
                  <Text variant="titleSmall">{violation.type}</Text>
                  <Chip
                    compact
                    style={{
                      backgroundColor:
                        violation.severity === 'critical'
                          ? theme.colors.error + '20'
                          : violation.severity === 'serious'
                          ? theme.colors.tertiary + '20'
                          : theme.colors.secondary + '20',
                    }}
                  >
                    {violation.severity}
                  </Chip>
                </View>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {violation.description}
                </Text>
                {violation.fine && (
                  <Text variant="labelMedium" style={{ color: theme.colors.error, marginTop: 4 }}>
                    Fine: {violation.fine} YER
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', padding: 16 }}>
              No violations recorded
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Findings */}
      {inspection.findings && inspection.findings.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Findings
            </Text>
            {inspection.findings.map((finding: any, index: number) => (
              <View key={index} style={styles.findingItem}>
                <Icon name="lightbulb-outline" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ marginLeft: 8, flex: 1 }}>
                  {finding.description}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Recommendations */}
      {inspection.recommendations && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Recommendations
            </Text>
            <Text variant="bodyMedium">{inspection.recommendations}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {inspection.status === 'scheduled' && (
          <>
            <Button
              mode="contained"
              onPress={() => {}}
              style={styles.actionButton}
            >
              Start Inspection
            </Button>
            <Button
              mode="outlined"
              onPress={() => {}}
              style={styles.actionButton}
            >
              Reschedule
            </Button>
          </>
        )}
        {inspection.status === 'in_progress' && (
          <Button
            mode="contained"
            onPress={() => {}}
            style={styles.actionButton}
          >
            Complete Inspection
          </Button>
        )}
        <Button
          mode="text"
          onPress={() => {}}
          style={styles.actionButton}
        >
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employerName: {
    fontWeight: 'bold',
    flex: 1,
  },
  statusChip: {
    marginLeft: 8,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  violationItem: {
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    // Styles
  },
});