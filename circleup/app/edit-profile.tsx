import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { api } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { useToast } from '../components/common/ToastProvider';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.post('/auth/me');
      setName(res.data.name || '');
      setEmail(res.data.email || '');
      setAvatarUrl(res.data.avatar_url || '');
    } catch (error) {
      showToast('Could not load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setUploadingAvatar(true);
        const imgUri = result.assets[0].uri;
        
        const formData = new FormData();
        const filename = imgUri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('file', {
          uri: imgUri,
          name: filename,
          type,
        } as any);

        const uploadRes = await api.post('/auth/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setAvatarUrl(uploadRes.data.avatar_url);
        showToast('Profile photo updated!', 'success');
      }
    } catch (error) {
      console.error(error);
      showToast('Failed to update photo', 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.put('/auth/me', { name: name.trim() });
      showToast('Profile updated successfully!', 'success');
      router.back();
    } catch (error) {
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} style={styles.flex}>
      <View style={[styles.container, { paddingTop: insets.top + SPACING.s }]}>
        <StatusBar style="dark" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: scale(44) }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.avatarContainer} onPress={handleUpdateAvatar} disabled={uploadingAvatar}>
               <View>
                 <Image 
                   source={{ uri: avatarUrl || `https://api.dicebear.com/7.x/lorelei/svg?seed=${name || 'CircleUp'}` }} 
                   style={[styles.avatar, uploadingAvatar && { opacity: 0.5 }]}
                 />
                 {uploadingAvatar && (
                   <View style={StyleSheet.absoluteFillObject} style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center'}}>
                     <ActivityIndicator color={COLORS.primary} size="large" />
                   </View>
                 )}
                 <View style={{position: 'absolute', bottom: 5, right: 5, backgroundColor: COLORS.primary, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: COLORS.white}}>
                   <Ionicons name="camera" size={16} color={COLORS.white} />
                 </View>
               </View>
               <Text style={styles.avatarHint}>Tap to change photo</Text>
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={scale(20)} color={COLORS.grey} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your Name"
                  placeholderTextColor={COLORS.grey}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address (Read-only)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: COLORS.lightGrey, opacity: 0.7 }]}>
                <Ionicons name="mail-outline" size={scale(20)} color={COLORS.grey} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  editable={false}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.saveButton, (!name.trim() || saving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!name.trim() || saving}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    marginBottom: SPACING.l,
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: normalize(20),
    fontWeight: '800',
    color: COLORS.primary,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.grey, fontSize: normalize(16) },
  content: { flex: 1, paddingHorizontal: SPACING.l },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(32),
  },
  avatar: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: COLORS.lightGrey,
    marginBottom: SPACING.s,
  },
  avatarHint: { fontSize: normalize(12), color: COLORS.grey, fontWeight: '600' },
  inputGroup: { marginBottom: verticalScale(24) },
  label: {
    fontSize: normalize(14),
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.s,
    marginLeft: SPACING.s,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    height: verticalScale(60),
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  inputIcon: { marginRight: SPACING.m },
  textInput: {
    flex: 1,
    fontSize: normalize(16),
    fontWeight: '600',
    color: COLORS.primary,
  },
  saveButton: {
    width: '100%',
    height: verticalScale(60),
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.l,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.m,
    ...SHADOWS.accent,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: normalize(16), fontWeight: '900', color: COLORS.primary },
});
