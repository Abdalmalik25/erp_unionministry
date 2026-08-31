/**
 * Profile Screen - User profile information and editing
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Card,
  Button,
  TextInput,
  Avatar,
  Chip,
  IconButton,
  Divider,
  ActivityIndicator,
  Snackbar,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updateUser } from '../../store/slices/authSlice';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  employee_id: string;
  bio: string;
  avatar_uri?: string;
}

export function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  
  const { user } = useAppSelector((state) => state.auth);
  const { language } = useAppSelector((state) => state.settings);
  
  const [form, setForm] = useState<ProfileForm>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    role: user?.role || '',
    department: user?.department || '',
    employee_id: user?.employee_id || '',
    bio: user?.bio || '',
  });
  
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const isRTL = language === 'ar';

  const handleChange = (field: keyof ProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.name || !form.email) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'الاسم والبريد الإلكتروني مطلوبان' : 'Name and email are required'
      );
      return;
    }
    
    setLoading(true);
    
    try {
      // Dispatch update action
      dispatch(updateUser(form));
      
      setEditing(false);
      setSnackbarMessage(isRTL ? 'تم تحديث الملف الشخصي' : 'Profile updated successfully');
      setSnackbarVisible(true);
    } catch (error) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'فشل تحديث الملف الشخصي' : 'Failed to update profile'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      role: user?.role || '',
      department: user?.department || '',
      employee_id: user?.employee_id || '',
      bio: user?.bio || '',
    });
    setEditing(false);
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isRTL ? 'الإذن مطلوب' : 'Permission Required',
          isRTL ? 'يرجى منح إذن الوصول للمكتبة' : 'Please grant library access permission'
        );
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        setForm((prev) => ({ ...prev, avatar_uri: result.assets[0].uri }));
      }
    } catch (error) {
      Alert.alert(
        isRTL ? 'خطأ' : 'Error',
        isRTL ? 'فشل اختيار الصورة' : 'Failed to pick image'
      );
    }
  };

  const handleChangePassword = () => {
    Alert.alert(
      isRTL ? 'تغيير كلمة المرور' : 'Change Password',
      isRTL ? 'سيتم إرسال رابط إعادة التعيين إلى بريدك' : 'A reset link will be sent to your email',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'إرسال' : 'Send',
          onPress: () => {
            setSnackbarMessage(
              isRTL 
                ? 'تم إرسال رابط إعادة التعيين' 
                : 'Reset link sent to your email'
            );
            setSnackbarVisible(true);
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2);
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return isRTL ? 'مدير' : 'Administrator';
      case 'inspector': return isRTL ? 'مفتش' : 'Inspector';
      case 'manager': return isRTL ? 'مدير قسم' : 'Manager';
      case 'viewer': return isRTL ? 'مشاهد' : 'Viewer';
      default: return role;
    }
  };

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              {form.avatar_uri ? (
                <Avatar.Image
                  size={96}
                  source={{ uri: form.avatar_uri }}
                />
              ) : (
                <Avatar.Text
                  size={96}
                  label={getInitials(form.name)}
                  style={{ backgroundColor: theme.colors.primary }}
                />
              )}
              {editing && (
                <IconButton
                  icon="camera"
                  mode="contained"
                  size={20}
                  onPress={handlePickAvatar}
                  style={styles.cameraButton}
                />
              )}
            </View>
            
            <Text variant="headlineSmall" style={styles.userName}>
              {form.name || (isRTL ? 'مستخدم' : 'User')}
            </Text>
            <Chip
              mode="flat"
              icon="shield-account"
              style={styles.roleChip}
            >
              {getRoleLabel(form.role)}
            </Chip>
          </Card.Content>
        </Card>

        {/* Profile Form */}
        <Card style={styles.formCard}>
          <Card.Title
            title={isRTL ? 'المعلومات الشخصية' : 'Personal Information'}
            right={() => (
              <IconButton
                icon={editing ? 'close' : 'pencil'}
                onPress={() => editing ? handleCancel() : setEditing(true)}
              />
            )}
          />
          <Card.Content>
            <TextInput
              label={isRTL ? 'الاسم الكامل' : 'Full Name'}
              value={form.name}
              onChangeText={(v) => handleChange('name', v)}
              mode="outlined"
              disabled={!editing}
              left={<TextInput.Icon icon="account" />}
              style={styles.input}
            />
            <TextInput
              label={isRTL ? 'البريد الإلكتروني' : 'Email'}
              value={form.email}
              onChangeText={(v) => handleChange('email', v)}
              mode="outlined"
              disabled={!editing}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
            />
            <TextInput
              label={isRTL ? 'رقم الهاتف' : 'Phone Number'}
              value={form.phone}
              onChangeText={(v) => handleChange('phone', v)}
              mode="outlined"
              disabled={!editing}
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone" />}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Work Information */}
        <Card style={styles.formCard}>
          <Card.Title
            title={isRTL ? 'معلومات العمل' : 'Work Information'}
            left={(props) => <Icon {...props} name="briefcase" />}
          />
          <Card.Content>
            <TextInput
              label={isRTL ? 'الرقم الوظيفي' : 'Employee ID'}
              value={form.employee_id}
              onChangeText={(v) => handleChange('employee_id', v)}
              mode="outlined"
              disabled={!editing}
              left={<TextInput.Icon icon="identifier" />}
              style={styles.input}
            />
            <TextInput
              label={isRTL ? 'القسم' : 'Department'}
              value={form.department}
              onChangeText={(v) => handleChange('department', v)}
              mode="outlined"
              disabled={!editing}
              left={<TextInput.Icon icon="domain" />}
              style={styles.input}
            />
            <TextInput
              label={isRTL ? 'نبذة عني' : 'Bio'}
              value={form.bio}
              onChangeText={(v) => handleChange('bio', v)}
              mode="outlined"
              disabled={!editing}
              multiline
              numberOfLines={4}
              left={<TextInput.Icon icon="text" />}
              style={styles.input}
            />
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        {editing && (
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.actionButton}
              disabled={loading}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={styles.actionButton}
              disabled={loading}
              icon={loading ? undefined : 'content-save'}
            >
              {loading 
                ? (isRTL ? 'جاري الحفظ...' : 'Saving...') 
                : (isRTL ? 'حفظ التغييرات' : 'Save Changes')
              }
            </Button>
          </View>
        )}

        {/* Security */}
        <Card style={styles.formCard}>
          <Card.Title
            title={isRTL ? 'الأمان' : 'Security'}
            left={(props) => <Icon {...props} name="shield-lock" />}
          />
          <Card.Content>
            <Button
              mode="outlined"
              icon="lock-reset"
              onPress={handleChangePassword}
              style={styles.securityButton}
            >
              {isRTL ? 'تغيير كلمة المرور' : 'Change Password'}
            </Button>
            <Button
              mode="outlined"
              icon="key"
              onPress={() => {
                Alert.alert(
                  isRTL ? 'مفاتيح API' : 'API Keys',
                  isRTL ? 'إدارة مفاتيح API الشخصية' : 'Manage your personal API keys'
                );
              }}
              style={styles.securityButton}
            >
              {isRTL ? 'مفاتيح API' : 'API Keys'}
            </Button>
          </Card.Content>
        </Card>

        {/* Account Information */}
        <Card style={styles.formCard}>
          <Card.Title
            title={isRTL ? 'معلومات الحساب' : 'Account Information'}
            left={(props) => <Icon {...props} name="information" />}
          />
          <Card.Content>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                {isRTL ? 'تاريخ التسجيل' : 'Member Since'}
              </Text>
              <Text variant="bodyMedium">
                {user?.created_at 
                  ? new Date(user.created_at).toLocaleDateString()
                  : '-'}
              </Text>
            </View>
            <Divider style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                {isRTL ? 'آخر تسجيل دخول' : 'Last Login'}
              </Text>
              <Text variant="bodyMedium">
                {user?.last_login_at 
                  ? new Date(user.last_login_at).toLocaleString()
                  : '-'}
              </Text>
            </View>
            <Divider style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>
                {isRTL ? 'حالة الحساب' : 'Account Status'}
              </Text>
              <Chip
                mode="flat"
                icon="check-circle"
                style={{ backgroundColor: '#4CAF5020' }}
                textStyle={{ color: '#4CAF50' }}
              >
                {isRTL ? 'نشط' : 'Active'}
              </Chip>
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
  headerCard: {
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
  },
  userName: {
    fontWeight: '600',
    marginBottom: 8,
  },
  roleChip: {
    marginTop: 4,
  },
  formCard: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  securityButton: {
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    opacity: 0.7,
  },
  infoDivider: {
    marginVertical: 4,
  },
});
