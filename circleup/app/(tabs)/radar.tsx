import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, TextInput, Platform, FlatList, ScrollView } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown, SlideOutDown, ZoomIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { api } from '../../services/api';
import { useToast } from '../../components/common/ToastProvider';

const CATEGORIES = ['All', 'Drills', 'Garden', 'Ladders', 'Safety', 'Cleaning'];

const getToolIcon = (type: string) => {
  switch (type) {
    case 'drill': return 'tools';
    case 'grass': return 'grass';
    case 'water': return 'water-pump';
    case 'ladder': return 'ladder';
    case 'wrench': return 'wrench';
    default: return 'tools';
  }
};

export default function RadarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const { showToast } = useToast();
  
  const [tools, setTools] = useState<any[]>([]);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [centerCoord, setCenterCoord] = useState({ latitude: 28.5355, longitude: 77.3910 });

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        // 1. ALWAYS try automatic GPS first (user's request)
        let { status } = await Location.requestForegroundPermissionsAsync();
        let targetCoord = null;

        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          targetCoord = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          console.log('[Radar] Automatic location found');
        } else {
          // 2. Fallback to saved neighborhood if GPS denied
          const userRes = await api.post('/auth/me');
          const userData = userRes.data;
          if (userData.latitude && userData.longitude) {
            targetCoord = { latitude: userData.latitude, longitude: userData.longitude };
            console.log('[Radar] Using saved neighborhood fallback');
          }
        }

        if (targetCoord && isActive) {
          setCenterCoord(targetCoord);
          mapRef.current?.animateToRegion({
            ...targetCoord,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }, 1000);

          fetchTools(targetCoord.latitude, targetCoord.longitude, selectedCategory, searchQuery);
        }
      } catch (err) {
        console.warn('Could not fetch location or tools', err);
      }
    })();
    return () => { isActive = false; };
  }, []);

  const fetchTools = async (lat: number, lon: number, cat: string, query: string) => {
    try {
      const res = await api.get('/tools/nearby', {
        params: { 
          lat, 
          lon, 
          radius: 5.0,
          category: cat === 'All' ? undefined : cat,
          query: query || undefined
        }
      });
      setTools(res.data || []);
    } catch (err) {
      console.error('Fetch tools error:', err);
    }
  };

  // NEW: Refetch when filters change (with debounce logic if possible, or just on change for MVP)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (centerCoord) {
        fetchTools(centerCoord.latitude, centerCoord.longitude, selectedCategory, searchQuery);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedCategory, searchQuery]);

  const initialRegion = {
    latitude: 28.5355,
    longitude: 77.3910,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  const handleZoom = (direction: 'in' | 'out') => {
    mapRef.current?.getCamera().then((cam) => {
      cam.zoom = direction === 'in' ? (cam.zoom || 15) + 1 : (cam.zoom || 15) - 1;
      mapRef.current?.animateCamera(cam, { duration: 300 });
    });
  };

  const goToCurrentLocation = () => {
    mapRef.current?.animateToRegion({
      ...centerCoord,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* 1. Full-Screen Map (Uber/Zomato Style) */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={mapStyle}
        onPress={() => setSelectedTool(null)}
        showsUserLocation={false} 
        showsCompass={false}
        showsScale={false}
      >
        {/* 1 KM Radius System */}
        <Circle
          center={centerCoord}
          radius={1000} // 1 km
          fillColor={COLORS.accent + '15'} // 15% opacity accent orange
          strokeColor={COLORS.accent + '80'}
          strokeWidth={1.5}
        />

        {/* User Location Node */}
        <Marker coordinate={centerCoord} anchor={{ x: 0.5, y: 0.5 }} zIndex={999}>
          <View style={styles.userMarkerContainer}>
            <View style={styles.userMarkerPulse} />
            <View style={styles.userMarkerInner} />
          </View>
        </Marker>

        {/* Tool Markers (Icon Only) */}
        {(tools || []).map((tool, idx) => (
          <Marker
            key={tool.id}
            coordinate={{ 
              latitude: tool.latitude || centerCoord.latitude, 
              longitude: tool.longitude || centerCoord.longitude 
            }}
            onPress={() => setSelectedTool(tool)}
            tracksViewChanges={false} // Performance optimization
          >
             <Animated.View 
                entering={ZoomIn.delay(idx * 100).springify()}
                style={[
                    styles.toolMarker,
                    selectedTool?.id === tool.id && styles.toolMarkerActive
                ]}
             >
                <MaterialCommunityIcons 
                    name={getToolIcon(tool.category)} 
                    size={scale(18)} 
                    color={selectedTool?.id === tool.id ? COLORS.white : COLORS.primary} 
                />
                {tool.owner_is_verified && (
                    <View style={styles.verifiedDot}>
                        <Ionicons name="shield-checkmark" size={scale(8)} color={COLORS.white} />
                    </View>
                )}
            </Animated.View>
          </Marker>
        ))}
      </MapView>

      {/* 2. Top UI Header */}
      <View style={[styles.topHeaderContainer, { paddingTop: insets.top + SPACING.s }]}>
        
        {/* App Bar Layer */}
        <View style={styles.appBarRow}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.avatarHolder}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?u=ayush' }} 
              style={styles.avatarMini}
            />
          </TouchableOpacity>
          
          <Text style={styles.appName}>Circle<Text style={styles.appNameAccent}>Up</Text></Text>
          
          <TouchableOpacity style={styles.karmaBadge} onPress={() => router.push('/karma')}>
            <MaterialCommunityIcons name="star-four-points" size={scale(14)} color={COLORS.accent} />
            <Text style={styles.karmaText}>450</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar & Filter Layer */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={scale(18)} color={COLORS.grey} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search tools nearby..."
              placeholderTextColor={COLORS.grey}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={scale(18)} color={COLORS.grey} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.filterBtnIcon}
            onPress={() => {
              router.push('/circles');
            }}
          >
             <Ionicons name="people-outline" size={scale(20)} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Categories Scroller */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity 
              key={cat} 
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillActive
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <MaterialCommunityIcons 
                name={getToolIcon(cat.toLowerCase())} 
                size={scale(14)} 
                color={selectedCategory === cat ? COLORS.white : COLORS.primary} 
              />
              <Text style={[
                styles.categoryPillText,
                selectedCategory === cat && styles.categoryPillTextActive
              ]}>
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Location Radius Badge */}
        <View style={styles.locationBadgeRow}>
          <View style={styles.locationBadge}>
            <MaterialCommunityIcons name="map-marker-radius" size={scale(14)} color={COLORS.white} />
            <Text style={styles.locationBadgeText}>Mumbai • 1 km radius</Text>
          </View>
        </View>
      </View>

      {/* 3. Floating Action Buttons */}
      <View style={[styles.fabContainer, { bottom: selectedTool ? verticalScale(180) : verticalScale(100) }]}>
        <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.fabBtnZoom} onPress={() => handleZoom('in')}>
            <Ionicons name="add" size={scale(22)} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity style={styles.fabBtnZoom} onPress={() => handleZoom('out')}>
            <Ionicons name="remove" size={scale(22)} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.fabBtnGPS} onPress={goToCurrentLocation}>
           <MaterialCommunityIcons name="crosshairs-gps" size={scale(24)} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* 4. Bottom Sheet Overview (Airbnb/Uber Style) */}
      {selectedTool && (
        <Animated.View 
          entering={SlideInDown.duration(400).springify().damping(16)}
          exiting={SlideOutDown.duration(200)}
          style={[styles.bottomSheet, { paddingBottom: insets.bottom || SPACING.m, width: width }]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
               <Text style={styles.sheetTitle} numberOfLines={1}>{selectedTool.name}</Text>
               <Text style={styles.sheetDistance}>
                    <Ionicons name="location-outline" size={normalize(12)} color={COLORS.grey} /> Nearby  •  By {selectedTool.owner_name || 'Community'}
               </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedTool(null)} style={styles.sheetCloseBtn}>
               <Ionicons name="close" size={scale(20)} color={COLORS.grey} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
             style={styles.sheetViewBtn}
             onPress={() => router.push(`/tool-details?id=${selectedTool.id}`)}
             activeOpacity={0.8}
          >
            <Text style={styles.sheetViewBtnText}>View Details</Text>
            <Ionicons name="arrow-forward" size={scale(18)} color={COLORS.white} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// Minimal, clean map style avoiding clutter
const mapStyle = [
  {
    "featureType": "poi",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "transit",
    "elementType": "labels",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#e9e9e9" }]
  }
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  
  // Header
  topHeaderContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    paddingHorizontal: SPACING.m,
    zIndex: 10,
  },
  appBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.s,
  },
  avatarHolder: {
    ...SHADOWS.soft,
    borderRadius: scale(20),
  },
  avatarMini: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  appName: {
    fontSize: normalize(20),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  appNameAccent: { color: COLORS.accent },
  karmaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.s,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.m,
    ...SHADOWS.soft,
  },
  karmaText: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: scale(4),
  },
  
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    paddingHorizontal: SPACING.m,
    height: verticalScale(50),
    marginRight: SPACING.s,
    ...SHADOWS.medium,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.s,
    fontSize: normalize(15),
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterBtnIcon: {
    width: verticalScale(50),
    height: verticalScale(50),
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  categoryScroll: {
    marginTop: SPACING.s,
    maxHeight: verticalScale(45),
  },
  categoryScrollContent: {
    paddingRight: SPACING.l,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  categoryPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryPillText: {
    fontSize: normalize(10),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  categoryPillTextActive: {
    color: COLORS.white,
  },
  locationBadgeRow: { alignItems: 'center', marginTop: SPACING.xs },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.medium,
  },
  locationBadgeText: {
    color: COLORS.white,
    fontSize: normalize(12),
    fontWeight: '700',
    marginLeft: scale(6),
  },

  // Markers
  userMarkerContainer: { alignItems: 'center', justifyContent: 'center' },
  userMarkerPulse: {
    position: 'absolute',
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.primary + '30',
  },
  userMarkerInner: {
    width: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  
  toolMarker: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  toolMarkerActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    transform: [{ scale: 1.15 }],
  },
  verifiedDot: {
    position: 'absolute',
    top: -scale(4),
    right: -scale(4),
    backgroundColor: COLORS.success,
    borderRadius: scale(8),
    width: scale(14),
    height: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
    ...SHADOWS.soft,
  },

  // Category Filters
  filterRow: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  filterScroll: {
    paddingHorizontal: SPACING.l,
  },
  catBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightGrey,
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginRight: 10,
  },
  catBadgeActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  catText: {
    fontSize: normalize(13),
    fontWeight: '700',
    color: COLORS.grey,
  },
  catTextActive: {
    color: COLORS.white,
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: SPACING.m,
    alignItems: 'center',
  },
  zoomControls: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    marginBottom: SPACING.m,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  fabBtnZoom: {
    width: scale(44),
    height: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    width: scale(30),
    height: 1,
    backgroundColor: COLORS.lightGrey,
    alignSelf: 'center',
  },
  fabBtnGPS: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.s,
    ...SHADOWS.medium,
  },
  sheetHandle: {
    width: scale(40),
    height: scale(5),
    backgroundColor: COLORS.divider,
    borderRadius: scale(3),
    alignSelf: 'center',
    marginBottom: SPACING.m,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.l,
  },
  sheetTitle: {
    fontSize: normalize(20),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: scale(4),
  },
  sheetDistance: {
    fontSize: normalize(14),
    color: COLORS.grey,
    fontWeight: '600',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetCloseBtn: {
    width: scale(32),
    height: scale(32),
    backgroundColor: COLORS.lightGrey,
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.s,
  },
  sheetViewBtn: {
    height: verticalScale(56),
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.s,
  },
  sheetViewBtnText: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: COLORS.white,
    marginRight: SPACING.s,
  },
});