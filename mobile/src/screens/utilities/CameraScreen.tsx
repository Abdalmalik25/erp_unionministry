/**
 * Camera Screen - Capture photos for violations and evidence
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  IconButton,
  Button,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addPhoto } from '../../store/slices/offlineSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type RouteProps = RouteProp<RootStackParamList, 'Camera'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CapturedPhoto {
  uri: string;
  timestamp: Date;
  type: 'violation' | 'evidence' | 'worker';
  description?: string;
  latitude?: number;
  longitude?: number;
}

export function CameraScreen() {
  const theme = useTheme();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const { inspectionId, type } = route.params;
  const { language } = useAppSelector((state) => state.settings);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('auto');
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  
  const cameraRef = useRef<Camera>(null);
  
  const isRTL = language === 'ar';

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Also request location permission for geotagging
      const locationStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
        });
        
        if (photo) {
          const newPhoto: CapturedPhoto = {
            uri: photo.uri,
            timestamp: new Date(),
            type: type,
          };
          
          setCapturedPhotos((prev) => [...prev, newPhoto]);
          
          // Store in offline slice
          dispatch(addPhoto({
            inspectionId: inspectionId || 'temp',
            photo: newPhoto,
          }));
          
          // Show description modal
          setSelectedPhoto(newPhoto);
          setDescriptionModalVisible(true);
        }
      } catch (error) {
        Alert.alert(
          isRTL ? 'خطأ' : 'Error',
          isRTL ? 'فشل التقاط الصورة' : 'Failed to capture photo'
        );
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        const newPhoto: CapturedPhoto = {
          uri: result.assets[0].uri,
          timestamp: new Date(),
          type: type,
        };
        
        setCapturedPhotos((prev) => [...prev, newPhoto]);
        setSelectedPhoto(newPhoto);
        setDescriptionModalVisible(true);
      }
    } catch (error) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'فشل اختيار الصورة' : 'Failed to pick image'
      );
    }
  };

  const deletePhoto = (photo: CapturedPhoto) => {
    Alert.alert(
      isRTL ? 'حذف الصورة' : 'Delete Photo',
      isRTL ? 'هل أنت متأكد من حذف هذه الصورة؟' : 'Are you sure you want to delete this photo?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'حذف' : 'Delete',
          style: 'destructive',
          onPress: () => {
            setCapturedPhotos((prev) => prev.filter((p) => p.uri !== photo.uri));
          },
        },
      ]
    );
  };

  const savePhotos = () => {
    if (capturedPhotos.length === 0) {
      Alert.alert(
        isRTL ? 'لا توجد صور' : 'No Photos',
        isRTL ? 'يرجى التقاط صورة واحدة على الأقل' : 'Please capture at least one photo'
      );
      return;
    }
    
    // Navigate back with photos
    navigation.goBack();
  };

  const toggleCameraType = () => {
    setCameraType((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlashMode((prev) => {
      switch (prev) {
        case 'off': return 'auto';
        case 'auto': return 'on';
        case 'on': return 'off';
        default: return 'off';
      }
    });
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>
          {isRTL ? 'جاري طلب إذن الكاميرا...' : 'Requesting camera permission...'}
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="camera-off" size={64} color={theme.colors.error} />
        <Text variant="bodyLarge" style={styles.errorText}>
          {isRTL ? 'لم يتم منح إذن الكاميرا' : 'Camera permission not granted'}
        </Text>
        <Button
          mode="contained"
          onPress={() => Camera.requestCameraPermissionsAsync()}
          style={styles.permissionButton}
        >
          {isRTL ? 'منح الإذن' : 'Grant Permission'}
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.permissionButton}
        >
          {isRTL ? 'العودة' : 'Go Back'}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        onCameraReady={() => setCameraReady(true)}
      >
        {/* Top Controls */}
        <View style={styles.topControls}>
          <IconButton
            icon="close"
            iconColor="white"
            size={28}
            onPress={() => navigation.goBack()}
            style={styles.controlButton}
          />
          <View style={styles.topRightControls}>
            <IconButton
              icon={flashMode === 'off' ? 'flash-off' : flashMode === 'on' ? 'flash' : 'flash-auto'}
              iconColor="white"
              size={28}
              onPress={toggleFlash}
              style={styles.controlButton}
            />
            <IconButton
              icon="camera-flip"
              iconColor="white"
              size={28}
              onPress={toggleCameraType}
              style={styles.controlButton}
            />
          </View>
        </View>
        
        {/* Type Badge */}
        <View style={styles.typeBadge}>
          <Surface style={styles.typeBadgeInner} elevation={2}>
            <Icon
              name={
                type === 'violation' ? 'alert' :
                type === 'evidence' ? 'file-document' : 'account'
              }
              size={16}
              color={theme.colors.primary}
            />
            <Text variant="labelMedium" style={styles.typeBadgeText}>
              {type === 'violation' ? (isRTL ? 'مخالفة' : 'Violation') :
               type === 'evidence' ? (isRTL ? 'دليل' : 'Evidence') : (isRTL ? 'عامل' : 'Worker')}
            </Text>
          </Surface>
        </View>
        
        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          {/* Photo Gallery Preview */}
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={() => {
              if (capturedPhotos.length > 0) {
                setSelectedPhoto(capturedPhotos[capturedPhotos.length - 1]);
                setDescriptionModalVisible(true);
              }
            }}
          >
            {capturedPhotos.length > 0 ? (
              <View style={styles.galleryPreview}>
                <Icon name="image" size={24} color="white" />
                <View style={styles.photoCount}>
                  <Text variant="labelSmall" style={styles.photoCountText}>
                    {capturedPhotos.length}
                  </Text>
                </View>
              </View>
            ) : (
              <Icon name="image" size={24} color="white" />
            )}
          </TouchableOpacity>
          
          {/* Capture Button */}
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonDisabled,
            ]}
            onPress={takePicture}
            disabled={isCapturing || !cameraReady}
          >
            <View style={styles.captureButtonInner}>
              {isCapturing && (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              )}
            </View>
          </TouchableOpacity>
          
          {/* Gallery Button */}
          <TouchableOpacity
            style={styles.galleryButton}
            onPress={pickImage}
          >
            <Icon name="image-multiple" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </Camera>
      
      {/* Photo Count Indicator */}
      {capturedPhotos.length > 0 && (
        <Surface style={styles.photoIndicator} elevation={3}>
          <Text variant="labelMedium" style={styles.photoIndicatorText}>
            {capturedPhotos.length} {isRTL ? 'صور ملتقطة' : 'photos captured'}
          </Text>
          <Button
            mode="contained"
            compact
            onPress={savePhotos}
          >
            {isRTL ? 'حفظ' : 'Save'}
          </Button>
        </Surface>
      )}
      
      {/* Description Modal */}
      <Portal>
        <Modal
          visible={descriptionModalVisible}
          onDismiss={() => setDescriptionModalVisible(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            {isRTL ? 'تفاصيل الصورة' : 'Photo Details'}
          </Text>
          {selectedPhoto && (
            <>
              <View style={styles.photoPreview}>
                <Icon name="image" size={48} color={theme.colors.outline} />
                <Text variant="bodySmall" style={styles.photoTime}>
                  {selectedPhoto.timestamp.toLocaleString()}
                </Text>
              </View>
              <TextInput
                label={isRTL ? 'الوصف (اختياري)' : 'Description (optional)'}
                value={selectedPhoto.description || ''}
                onChangeText={(text) => {
                  setSelectedPhoto((prev) => prev ? { ...prev, description: text } : null);
                  setCapturedPhotos((prev) =>
                    prev.map((p) =>
                      p.uri === selectedPhoto.uri ? { ...p, description: text } : p
                    )
                  );
                }}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.descriptionInput}
              />
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    deletePhoto(selectedPhoto);
                    setDescriptionModalVisible(false);
                  }}
                  textColor={theme.colors.error}
                  style={styles.modalButton}
                >
                  {isRTL ? 'حذف' : 'Delete'}
                </Button>
                <Button
                  mode="contained"
                  onPress={() => setDescriptionModalVisible(false)}
                  style={styles.modalButton}
                >
                  {isRTL ? 'تم' : 'Done'}
                </Button>
              </View>
            </>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: 'white',
  },
  errorText: {
    marginVertical: 16,
    textAlign: 'center',
    color: 'white',
  },
  permissionButton: {
    marginTop: 12,
    minWidth: 200,
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
  },
  topRightControls: {
    flexDirection: 'row',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginHorizontal: 4,
  },
  typeBadge: {
    alignItems: 'center',
  },
  typeBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  typeBadgeText: {
    textTransform: 'capitalize',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 24,
  },
  galleryButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryPreview: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoCountText: {
    color: 'white',
    fontSize: 10,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  photoIndicatorText: {},
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    marginBottom: 16,
  },
  photoPreview: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  photoTime: {
    marginTop: 8,
    opacity: 0.7,
  },
  descriptionInput: {
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
