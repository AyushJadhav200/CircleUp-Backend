import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../../constants/theme';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { useToast } from '../../components/common/ToastProvider';
import { api } from '../../services/api';
import * as Location from 'expo-location';


export default function AddAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  
  const [form, setForm] = useState({
    label: 'Home',
    receiver_name: '',
    phone: '',
    full_address: '',
    floor: '',
    city: 'Noida', // Default for now
    landmark: '',
    lat: null as number | null,
    lon: null as number | null
  });

  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const detectLocation = async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access location was denied', 'error');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });

      if (address) {
        // Build a readable address string
        const street = address.street || address.name || '';
        const houseNo = address.streetNumber ? `${address.streetNumber}, ` : '';
        const subregion = address.subregion ? `${address.subregion}, ` : '';
        const district = address.district ? `${address.district}` : '';
        
        const fullAddr = `${houseNo}${street} ${subregion}${district}`.trim();

        setForm(prev => ({
          ...prev,
          full_address: fullAddr,
          city: address.city || address.subregion || 'Noida',
          landmark: address.name !== street ? address.name || '' : '',
          lat: loc.coords.latitude,
          lon: loc.coords.longitude
        }));
        showToast('Location detected successfully!', 'success');

      }
    } catch (error) {
      console.error('[Location] Capture failed:', error);
      showToast('Could not detect location', 'error');
    } finally {
      setDetecting(false);
    }
  };


  const handleSave = async () => {
    if (!form.receiver_name || !form.phone || !form.full_address) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      // Mocking save to user profile for now
      // This will be updated to a real backend endpoint
      await api.patch('/auth/me', { address: form });
      showToast('Address saved successfully!', 'success');
      router.back();
    } catch (e) {
      showToast('Failed to save address', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery Details</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>WHERE SHOULD WE DELIVER?</Text>
            <TouchableOpacity 
              style={styles.detectBtn} 
              onPress={detectLocation}
              disabled={detecting}
            >
              {detecting ? (
                 <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="location" size={scale(16)} color={COLORS.primary} />
                  <Text style={styles.detectBtnText}>USE CURRENT</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          
          <View style={styles.labelRow}>
            {['Home', 'Office', 'Other'].map((lbl) => (
              <TouchableOpacity 
                key={lbl}
                style={[styles.labelBtn, form.label === lbl && styles.labelBtnActive]}
                onPress={() => setForm({ ...form, label: lbl })}
              >
                <Text style={[styles.labelText, form.label === lbl && styles.labelTextActive]}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Receiver's Name *</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. Ayush Sagar"
              value={form.receiver_name}
              onChangeText={(t) => setForm({ ...form, receiver_name: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. +91 9876543210"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Complete Address *</Text>
            <TextInput 
              style={[styles.input, styles.textArea]}
              placeholder="House No, Building Name, Street"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={form.full_address}
              onChangeText={(t) => setForm({ ...form, full_address: t })}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: SPACING.m }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Floor / Block</Text>
              <TextInput 
                style={styles.input}
                placeholder="e.g. 4th Floor"
                value={form.floor}
                onChangeText={(t) => setForm({ ...form, floor: t })}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>City</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="Noida"
                  value={form.city}
                  onChangeText={(t) => setForm({ ...form, city: t })}
                />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Famous Landmark (Optional)</Text>
            <TextInput 
              style={styles.input}
              placeholder="e.g. Near Metro Station"
              value={form.landmark}
              onChangeText={(t) => setForm({ ...form, landmark: t })}
            />
          </View>

          <View style={styles.infoNote}>
            <Ionicons name="information-circle-outline" size={scale(16)} color={COLORS.grey} />
            <Text style={styles.infoNoteText}>Our neighborhood courier will use this location for safe pickup and drop-off.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* SAVE BUTTON */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.l }]}>
        <TouchableOpacity 
          style={[styles.saveButton, loading && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>SAVE & CONTINUE</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: scale(40), height: scale(40), justifyContent: 'center' },
  headerTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  scrollContent: { padding: SPACING.l },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 20 
  },
  sectionTitle: { fontSize: normalize(11), fontWeight: '900', color: COLORS.divider, letterSpacing: 1.5 },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F3F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4
  },
  detectBtnText: {
    fontSize: normalize(10),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5
  },

  
  labelRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  labelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F0F3F7' },
  labelBtnActive: { backgroundColor: COLORS.primary },
  labelText: { fontSize: normalize(13), fontWeight: '800', color: COLORS.grey },
  labelTextActive: { color: 'white' },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: normalize(12), fontWeight: '800', color: COLORS.primary, marginBottom: 8 },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: 16,
    height: verticalScale(54),
    fontSize: normalize(14),
    fontWeight: '600',
    color: COLORS.primary,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  textArea: { height: verticalScale(80), paddingTop: 12 },
  
  infoNote: { flexDirection: 'row', gap: 8, marginTop: 10, opacity: 0.8 },
  infoNoteText: { fontSize: normalize(11), color: COLORS.grey, flex: 1, fontWeight: '500' },

  footer: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    backgroundColor: 'white',
    ...SHADOWS.medium,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    height: verticalScale(56),
    borderRadius: BORDER_RADIUS.m,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  saveButtonText: { color: 'white', fontSize: normalize(15), fontWeight: '900', letterSpacing: 1 },
});
