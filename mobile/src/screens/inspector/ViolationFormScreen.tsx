/**
 * Violation Form Screen
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, Surface, SegmentedButtons, IconButton, Card } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export function ViolationFormScreen({ navigation, route }: any) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [violationType, setViolationType] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [legalReference, setLegalReference] = useState('');
  const [fine, setFine] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.section} elevation={0}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Violation Details
        </Text>

        <TextInput
          mode="outlined"
          label="Violation Type"
          value={violationType}
          onChangeText={setViolationType}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label={t('violations.description')}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label={t('violations.descriptionAr')}
          value={descriptionAr}
          onChangeText={setDescriptionAr}
          multiline
          numberOfLines={3}
          style={styles.input}
        />
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('violations.severity')}
        </Text>
        <SegmentedButtons
          value={severity}
          onValueChange={setSeverity}
          buttons={[
            { value: 'minor', label: t('violations.minor') },
            { value: 'moderate', label: t('violations.moderate') },
            { value: 'serious', label: t('violations.serious') },
            { value: 'critical', label: t('violations.critical') },
          ]}
        />
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Additional Information
        </Text>

        <TextInput
          mode="outlined"
          label={t('violations.legalReference')}
          value={legalReference}
          onChangeText={setLegalReference}
          style={styles.input}
        />

        <TextInput
          mode="outlined"
          label={t('violations.fine')}
          value={fine}
          onChangeText={setFine}
          keyboardType="numeric"
          right={<TextInput.Affix text="YER" />}
          style={styles.input}
        />
      </Surface>

      <Surface style={styles.section} elevation={0}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          {t('violations.photos')}
        </Text>

        <View style={styles.photosGrid}>
          {photos.map((photo, index) => (
            <Card key={index} style={styles.photoCard}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <IconButton
                icon="close"
                size={16}
                style={styles.removePhoto}
                onPress={() => setPhotos(photos.filter((_, i) => i !== index))}
              />
            </Card>
          ))}
          <TouchableOpacity style={styles.addPhotoButton} onPress={() => {}}>
            <Icon name="camera-plus" size={32} color={theme.colors.primary} />
            <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4 }}>
              {t('violations.addPhoto')}
            </Text>
          </TouchableOpacity>
        </View>
      </Surface>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={() => {}}
          style={styles.button}
          disabled={!violationType || !description}
        >
          Save Violation
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
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: 100,
    height: 100,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  button: {
    // Styles
  },
});