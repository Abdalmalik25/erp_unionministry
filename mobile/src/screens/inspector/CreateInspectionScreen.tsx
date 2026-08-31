/**
 * Create Inspection Screen
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface, SegmentedButtons, List } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppSelector } from '../../hooks/useAppSelector';
import { selectEmployers } from '../../store/slices/employersSlice';

export function CreateInspectionScreen({ navigation }: any) {
  const theme = useTheme();
  const { t } = useTranslation();
  const employers = useAppSelector(selectEmployers);

  const [inspectionType, setInspectionType] = useState('routine');
  const [selectedEmployer, setSelectedEmployer] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [showEmployerList, setShowEmployerList] = useState(false);

  const selectedEmployerData = employers.find((e) => e.id === selectedEmployer);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.section} elevation={0}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('inspections.type')}
        </Text>
        <SegmentedButtons
          value={inspectionType}
          onValueChange={setInspectionType}
          buttons={[
            { value: 'routine', label: 'Routine' },
            { value: 'complaint', label: 'Complaint' },
            { value: 'follow_up', label: 'Follow-up' },
          ]}
        />
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('inspections.selectEmployer')}
        </Text>
        <List.Item
          title={selectedEmployerData?.name || 'Select employer'}
          description={selectedEmployerData?.sector || ''}
          left={(props) => <List.Icon {...props} icon="factory" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setShowEmployerList(!showEmployerList)}
          style={styles.employerSelector}
        />

        {showEmployerList && (
          <View style={styles.employerList}>
            {employers.slice(0, 10).map((employer) => (
              <List.Item
                key={employer.id}
                title={employer.name}
                description={employer.sector}
                onPress={() => {
                  setSelectedEmployer(employer.id);
                  setShowEmployerList(false);
                }}
                style={[
                  styles.employerItem,
                  selectedEmployer === employer.id && { backgroundColor: theme.colors.primaryContainer },
                ]}
              />
            ))}
          </View>
        )}
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Details
        </Text>
        <TextInput
          mode="outlined"
          label={t('inspections.scheduledDate')}
          value={scheduledDate}
          onChangeText={setScheduledDate}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          left={<TextInput.Icon icon="calendar" />}
        />
        <TextInput
          mode="outlined"
          label={t('inspections.location')}
          value={location}
          onChangeText={setLocation}
          style={styles.input}
          left={<TextInput.Icon icon="map-marker" />}
          right={<TextInput.Icon icon="crosshairs-gps" onPress={() => {}} />}
        />
        <TextInput
          mode="outlined"
          label={t('inspections.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          style={styles.input}
        />
      </Surface>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => {}}
          style={styles.button}
          disabled={!selectedEmployer || !scheduledDate}
        >
          Create Inspection
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.button}
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  employerSelector: {
    borderWidth: 1,
    borderRadius: 8,
  },
  employerList: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  employerItem: {
    paddingVertical: 4,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    // Styles
  },
});