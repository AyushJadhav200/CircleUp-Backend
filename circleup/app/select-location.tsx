import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { useToast } from '../components/common/ToastProvider';

const GOOGLE_API_KEY = 'AIzaSyBs8RoV-sPXVfdNT8vshrS3tUZM6HvxT-E';

export default function SelectLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState({
    latitude: 28.5355,
    longitude: 77.3910,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    })();
  }, []);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      setLoading(true);
      try {
        const res = await axios.get(
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${text}&key=${GOOGLE_API_KEY}&types=geocode`
        );
        setPredictions(res.data.predictions || []);
      } catch {
        // Fail silently
      } finally {
        setLoading(false);
      }
    } else {
      setPredictions([]);
    }
  };

  const onSelectPrediction = async (placeId: string, description: string) => {
    setSearchQuery(description);
    setPredictions([]);
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_API_KEY}`
      );
      const { lat, lng } = res.data.result.geometry.location;
      setRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    } catch {
      showToast('Could not fetch location details', 'error');
    }
  };

  const locateMe = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setRegion({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 });
      showToast('Location updated!', 'success');
    } catch {
      showToast('Could not get your location', 'error');
    }
  };

  return (
    <AdaptiveScreen
      style={styles.container}
      horizontalPadding={0}
      backgroundColor={COLORS.white}
      scrollable={true}
      useSafeArea={true}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Location</Text>
        <View style={{ width: scale(44) }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={scale(18)} color={COLORS.grey} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a neighborhood..."
            placeholderTextColor={COLORS.grey}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
        </View>

        {/* Suggestions Dropdown */}
        {predictions.length > 0 && (
          <View style={styles.predictions}>
            <FlatList
              data={predictions}
              keyExtractor={(item) => item.place_id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.predictionRow}
                  onPress={() => onSelectPrediction(item.place_id, item.description)}
                >
                  <Ionicons name="location-outline" size={scale(16)} color={COLORS.grey} />
                  <Text style={styles.predictionText} numberOfLines={1}>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>

      {/* Map Card */}
      <View style={styles.mapCard}>
        <View style={styles.mapContainer}>
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            region={region}
            onRegionChangeComplete={(r) => setRegion(r)}
          >
            <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
          </MapView>
          <TouchableOpacity style={styles.locateBtn} onPress={locateMe}>
            <Ionicons name="locate" size={scale(22)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.locationInfo}>
          <Text style={styles.locationTitle}>Confirm Location</Text>
          <Text style={styles.locationSub} numberOfLines={1} adjustsFontSizeToFit>
            {searchQuery || 'Pin your exact location on the map above'}
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.confirmBtn, loading && { opacity: 0.7 }]} 
          onPress={async () => {
            setLoading(true);
            try {
              const { API_URL, getToken } = await import('../services/api');
              const token = await getToken();
              const response = await axios.post(`${API_URL}/auth/me/location`, {
                latitude: region.latitude,
                longitude: region.longitude
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (response.data.status === 'success') {
                showToast('Location confirmed and saved!', 'success');
                router.replace('/(tabs)/radar');
              }
            } catch (error) {
              console.error('[Location] Save failed:', error);
              showToast('Failed to save location', 'error');
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <>
              <Text style={styles.confirmText}>Confirm Location</Text>
              <Ionicons name="checkmark-circle" size={scale(20)} color={COLORS.primary} style={{ marginLeft: SPACING.s }} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Saved Addresses */}
      <View style={styles.addressSection}>
        <Text style={styles.sectionTitle}>SAVED ADDRESSES</Text>
        {[
          { icon: 'home', label: 'Home', sub: '1248 North 45th St, Seattle' },
          { icon: 'business', label: 'Office', sub: 'Microsoft Building 92' },
        ].map((addr) => (
          <TouchableOpacity key={addr.label} style={styles.addressCard}>
            <View style={styles.addressIconBox}>
              <Ionicons name={addr.icon as any} size={scale(20)} color={COLORS.primary} />
            </View>
            <View style={styles.addressTextBox}>
              <Text style={styles.addressTitle}>{addr.label}</Text>
              <Text style={styles.addressSub} numberOfLines={1}>{addr.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={scale(18)} color={COLORS.divider} />
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={{ height: verticalScale(30) }} />
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
  },
  backBtn: { padding: scale(5) },
  headerTitle: { fontSize: normalize(18), fontWeight: '800', color: COLORS.primary },
  searchSection: {
    paddingHorizontal: SPACING.l,
    zIndex: 100,
    marginBottom: verticalScale(8),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.m,
    height: verticalScale(52),
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: normalize(15),
    color: COLORS.primary,
    fontWeight: '600',
  },
  predictions: {
    marginTop: SPACING.s,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.s,
    ...SHADOWS.medium,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.divider,
  },
  predictionText: { flex: 1, marginLeft: SPACING.s, fontSize: normalize(14), color: COLORS.primary, fontWeight: '600' },
  mapCard: {
    marginHorizontal: SPACING.l,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    ...SHADOWS.medium,
    marginBottom: SPACING.l,
  },
  mapContainer: {
    width: '100%',
    height: verticalScale(200),
    borderRadius: BORDER_RADIUS.m,
    overflow: 'hidden',
    marginBottom: SPACING.m,
    position: 'relative',
  },
  locateBtn: {
    position: 'absolute',
    bottom: SPACING.s,
    right: SPACING.s,
    width: scale(40),
    height: scale(40),
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  locationInfo: { marginBottom: SPACING.m },
  locationTitle: { fontSize: normalize(18), fontWeight: '800', color: COLORS.primary },
  locationSub: { fontSize: normalize(13), color: COLORS.grey, fontWeight: '600', marginTop: 4 },
  confirmBtn: {
    height: verticalScale(54),
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.accent,
  },
  confirmText: { fontSize: normalize(16), fontWeight: '900', color: COLORS.primary },
  addressSection: { paddingHorizontal: SPACING.l },
  sectionTitle: { fontSize: normalize(11), fontWeight: '900', color: COLORS.grey, letterSpacing: 1.5, marginBottom: SPACING.m },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.m,
    marginBottom: SPACING.s,
  },
  addressIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: 10,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  addressTextBox: { flex: 1 },
  addressTitle: { fontSize: normalize(15), fontWeight: '800', color: COLORS.primary },
  addressSub: { fontSize: normalize(12), fontWeight: '600', color: COLORS.grey },
});
