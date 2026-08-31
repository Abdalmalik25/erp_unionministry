/**
 * Map Screen - Display employer/worker location on map
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  IconButton,
  ActivityIndicator,
  Chip,
  FAB,
  Portal,
  Modal,
  Button,
  TextInput,
  SegmentedButtons,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchEmployerById } from '../../store/slices/employersSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type RouteProps = RouteProp<RootStackParamList, 'Map'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Location {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export function MapScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  
  const { employerId, latitude, longitude } = route.params || {};
  const { employer } = useAppSelector((state) => state.employers);
  const { language } = useAppSelector((state) => state.settings);
  
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<Location | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  
  const isRTL = language === 'ar';
  
  // Default center (Sana'a, Yemen)
  const defaultRegion: Region = {
    latitude: 15.3694,
    longitude: 44.1910,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  useEffect(() => {
    const loadLocation = async () => {
      setLoading(true);
      
      if (latitude && longitude) {
        setLocation({
          latitude,
          longitude,
          name: 'Selected Location',
        });
      } else if (employerId) {
        // Fetch employer location from API
        // For demo, using mock coordinates
        setLocation({
          latitude: 15.3694 + Math.random() * 0.1,
          longitude: 44.1910 + Math.random() * 0.1,
          name: employer?.name_ar || 'Employer Location',
          address: employer?.address,
        });
      }
      
      setLoading(false);
    };
    
    loadLocation();
  }, [employerId, latitude, longitude, employer]);

  const handleMarkerPress = (loc: Location) => {
    setSelectedMarker(loc);
  };

  const handleDirections = () => {
    if (location) {
      const url = Platform.select({
        ios: `maps:${location.latitude},${location.longitude}?daddr=${location.latitude},${location.longitude}`,
        android: `google.navigation:q=${location.latitude},${location.longitude}`,
      });
      // Would use Linking.openURL(url) in production
    }
  };

  const handleCenterOnLocation = () => {
    if (location) {
      // Map would animate to location
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>
          {isRTL ? 'جاري تحميل الخريطة...' : 'Loading map...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : defaultRegion}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {location && (
          <Marker
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name || (isRTL ? 'الموقع' : 'Location')}
            description={location.address}
            onPress={() => handleMarkerPress(location)}
          />
        )}
      </MapView>
      
      {/* Map Controls */}
      <View style={styles.controls}>
        <View style={styles.mapTypeButtons}>
          <IconButton
            icon="map"
            mode="contained-tonal"
            selected={mapType === 'standard'}
            onPress={() => setMapType('standard')}
            size={20}
          />
          <IconButton
            icon="satellite"
            mode="contained-tonal"
            selected={mapType === 'satellite'}
            onPress={() => setMapType('satellite')}
            size={20}
          />
          <IconButton
            icon="map-search"
            mode="contained-tonal"
            selected={mapType === 'hybrid'}
            onPress={() => setMapType('hybrid')}
            size={20}
          />
        </View>
        
        <IconButton
          icon="crosshairs-gps"
          mode="contained"
          onPress={handleCenterOnLocation}
        />
      </View>
      
      {/* Selected Location Card */}
      {selectedMarker && (
        <Surface style={styles.locationCard} elevation={4}>
          <View style={styles.locationCardContent}>
            <View style={styles.locationInfo}>
              <Icon name="map-marker" size={24} color={theme.colors.primary} />
              <View style={styles.locationText}>
                <Text variant="titleMedium">{selectedMarker.name || (isRTL ? 'الموقع' : 'Location')}</Text>
                {selectedMarker.address && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {selectedMarker.address}
                  </Text>
                )}
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {selectedMarker.latitude.toFixed(6)}, {selectedMarker.longitude.toFixed(6)}
                </Text>
              </View>
            </View>
            <View style={styles.locationActions}>
              <IconButton
                icon="directions"
                mode="contained"
                onPress={handleDirections}
              />
              <IconButton
                icon="close"
                onPress={() => setSelectedMarker(null)}
              />
            </View>
          </View>
        </Surface>
      )}
      
      {/* Legend */}
      <Surface style={styles.legend} elevation={2}>
        <Chip icon="map-marker" mode="flat" compact>
          {isRTL ? 'موقع الكيان' : 'Entity Location'}
        </Chip>
        <Chip icon="account" mode="flat" compact>
          {isRTL ? 'موقعك' : 'Your Location'}
        </Chip>
      </View>
      
      {/* Search FAB */}
      <FAB
        icon="magnify"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setSearchModalVisible(true)}
      />
      
      {/* Search Modal */}
      <Portal>
        <Modal
          visible={searchModalVisible}
          onDismiss={() => setSearchModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {isRTL ? 'البحث عن موقع' : 'Search Location'}
          </Text>
          <TextInput
            label={isRTL ? 'عنوان أو اسم' : 'Address or name'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            style={styles.searchInput}
          />
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setSearchModalVisible(false)}
              style={styles.modalButton}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                // Search functionality would go here
                setSearchModalVisible(false);
              }}
              style={styles.modalButton}
            >
              {isRTL ? 'بحث' : 'Search'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
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
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  controls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  mapTypeButtons: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
  },
  locationCard: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
  },
  locationCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  locationText: {
    flex: 1,
  },
  locationActions: {
    flexDirection: 'row',
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
    padding: 8,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 80,
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 16,
  },
  searchInput: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});
