import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Alert, FlatList, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveScreen } from '../../components/common/AdaptiveScreen';
import { api, TOKEN_KEY } from '../../services/api';
import * as SecureStore from 'expo-secure-store';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { useToast } from '../../components/common/ToastProvider';

const SETTINGS_OPTIONS = [
  { id: '1', icon: 'person-outline', title: 'Personal Info', subtitle: 'Manage your profile details', route: '/edit-profile' },
  { id: '2', icon: 'wallet-outline', title: 'Payment Methods', subtitle: 'Karma History & Wallet', route: '/karma' },
  { id: '3', icon: 'notifications-outline', title: 'Notifications', subtitle: 'Alerts and community updates', route: '/settings' },
  { id: '4', icon: 'help-circle-outline', title: 'Help & Support', subtitle: 'FAQs and direct assistance', route: '/tool-guide' },
];

const IMPACT_STATS: any[] = [];

const SettingItem = ({ item, onPress, index }: { item: any, onPress: () => void, index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 100 + 400).duration(500)}>
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
        <View style={styles.settingIconBox}>
        <Ionicons name={item.icon as any} size={scale(22)} color={COLORS.primary} />
        </View>
        <View style={styles.settingTextContainer}>
        <Text style={styles.settingTitle}>{item.title}</Text>
        <Text style={styles.settingSubtitle} numberOfLines={1}>{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={scale(18)} color={COLORS.divider} />
    </TouchableOpacity>
  </Animated.View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ tools_lent: 0 });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchData = async () => {
        try {
          const [profileRes, activityRes] = await Promise.all([
            api.post('/auth/me'),
            api.get('/tools/activity')
          ]);
          if (isActive) {
            setUser(profileRes.data);
            setStats(activityRes.data.stats || { tools_lent: 0 });
            setActivities(activityRes.data.activities || []);
          }
        } catch (e) {
          console.error('[Profile] Refresh Error:', e);
          if (isActive) setUser({ name: 'Guest', karma_points: 0 });
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchData();
      return () => { isActive = false; };
    }, [])
  );

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out of CircleUp?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive",
          onPress: async () => {
             await SecureStore.deleteItemAsync(TOKEN_KEY);
             showToast('Logged out successfully', 'info');
             router.replace('/');
          }
        }
      ]
    );
  };

  const renderHeader = () => {
    const activeBookings = activities.filter(a => a.status === 'In Progress');
    // Calculate simulated impact
    const co2Saved = (stats.tools_lent * 5.2).toFixed(1); // 5.2kg CO2 per share
    const moneySaved = stats.tools_lent * 1200; // Average ₹1200 saved per share vs buying
    
    return (
      <View style={styles.headerWrapper}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: user?.avatar_url || `https://api.dicebear.com/7.x/lorelei/svg?seed=${user?.name || 'ayush'}` }} 
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="disk"
              transition={200}
            />
            {user?.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={scale(20)} color={COLORS.success} />
              </View>
            )}
          </View>
          
          <Text style={styles.userName}>{user?.name || 'Community Member'}</Text>
          <View style={styles.locationContainer}>
            <View style={styles.liveDot} />
            <Text style={styles.locationText}>Live in Society Hub</Text>
          </View>
  
          <View style={styles.karmaBadgeLarge}>
             <MaterialCommunityIcons name="shield-star" size={scale(24)} color={COLORS.accent} />
             <View>
                <Text style={styles.karmaVal}>{user?.karma_points || 0}</Text>
                <Text style={styles.karmaSub}>NEIGHBOR SCORE</Text>
             </View>
          </View>
        </View>

        {(!user?.is_verified && !user?.id_document_url) && (
          <TouchableOpacity style={styles.verificationCard} onPress={() => router.push('/verify-identity' as any)}>
             <View style={styles.verificationIcon}>
                <Ionicons name="shield-outline" size={scale(20)} color={COLORS.error} />
             </View>
             <View style={{ flex: 1 }}>
                <Text style={styles.verificationTitle}>Verify Identity</Text>
                <Text style={styles.verificationSub}>Required for high-value tools (>₹1000)</Text>
             </View>
             <Ionicons name="chevron-forward" size={scale(18)} color={COLORS.error} />
          </TouchableOpacity>
        )}

        {(!user?.is_verified && user?.id_document_url) && (
          <View style={[styles.verificationCard, { borderColor: COLORS.accent, backgroundColor: '#FFF9F1' }]}>
             <View style={[styles.verificationIcon, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="time-outline" size={scale(20)} color={COLORS.accent} />
             </View>
             <View style={{ flex: 1 }}>
                <Text style={[styles.verificationTitle, { color: COLORS.accent }]}>Under Review</Text>
                <Text style={styles.verificationSub}>Admin is verifying your document</Text>
             </View>
          </View>
        )}

        <Text style={styles.sectionHeading}>EARTH & ECONOMY IMPACT</Text>
        <View style={styles.impactGrid}>
            <View style={[styles.impactSquare, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="leaf" size={scale(24)} color="#2E7D32" />
                <Text style={styles.impactValSmall}>{co2Saved}kg</Text>
                <Text style={styles.impactLabelSmall}>CO2 SAVED</Text>
            </View>
            <View style={[styles.impactSquare, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="cash" size={scale(24)} color="#1565C0" />
                <Text style={styles.impactValSmall}>₹{moneySaved}</Text>
                <Text style={styles.impactLabelSmall}>MONEY SAVED</Text>
            </View>
            <View style={[styles.impactSquare, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="people" size={scale(24)} color="#EF6C00" />
                <Text style={styles.impactValSmall}>{stats.tools_lent}</Text>
                <Text style={styles.impactLabelSmall}>HELPED</Text>
            </View>
        </View>
  
        {activeBookings.length > 0 && (
          <View style={styles.activeSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionHeading}>LIVE RENTALS</Text>
              <View style={styles.pulseContainer}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveLabel}>TRACKING</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeScroll}>
              {activeBookings.map((booking) => (
                <TouchableOpacity key={booking.id} style={styles.activeBookingCard} onPress={() => router.push('/(tabs)/activity')}>
                  <View style={[styles.bookingIcon, { backgroundColor: booking.type === 'lend' ? '#E3F2FD' : '#E8F5E9' }]}>
                    <Ionicons name={booking.type === 'lend' ? 'arrow-up' : 'arrow-down'} size={scale(20)} color={booking.type === 'lend' ? '#1565C0' : '#2E7D32'} />
                  </View>
                  <View>
                    <Text style={styles.bookingToolName}>{booking.tool}</Text>
                    <Text style={styles.bookingStatus}>{booking.type === 'lend' ? 'Out' : 'In Use'} • {booking.user}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
  
        <Text style={styles.sectionHeading}>PREFERENCES</Text>
      </View>
    );
  };

  const renderFooter = () => (
    <View style={styles.footerWrapper}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      <Text style={styles.versionText}>CircleUp v1.0.5 Command Center</Text>
      <View style={{ height: verticalScale(40) }} />
    </View>
  );

  const [activities, setActivities] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchProfile = async () => {
        try {
          const [profileRes, activityRes] = await Promise.all([
            api.post('/auth/me'),
            api.get('/tools/activity')
          ]);
          if (isActive) {
            setUser(profileRes.data);
            setStats(activityRes.data.stats || { tools_lent: 0 });
            setActivities(activityRes.data.activities || []);
          }
        } catch (e) {
          if (isActive) setUser({ name: 'Guest', karma_points: 0 });
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchProfile();
      return () => { isActive = false; };
    }, [])
  );

  return (
    <AdaptiveScreen 
      style={styles.mainContainer} 
      horizontalPadding={0} 
      scrollable={false}
      backgroundColor={COLORS.white}
    >
      <StatusBar style="dark" />
      
      <FlatList
        data={SETTINGS_OPTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SettingItem item={item} index={index} onPress={() => router.push(item.route as any)} />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  listContent: {
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(100),
  },
  headerWrapper: { marginBottom: verticalScale(10) },
  profileHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(32),
  },
  avatarContainer: {
    width: scale(100),
    height: scale(100),
    marginBottom: verticalScale(16),
  },
  avatar: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: COLORS.lightGrey,
    ...SHADOWS.soft,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 2,
    ...SHADOWS.soft,
  },
  userName: {
    fontSize: normalize(28),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  locationText: {
    fontSize: normalize(14),
    fontWeight: '600',
    color: COLORS.grey,
    marginLeft: 4,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 6 },
  karmaBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 12,
    ...SHADOWS.soft,
  },
  karmaVal: { fontSize: normalize(20), fontWeight: '900', color: COLORS.primary },
  karmaSub: { fontSize: normalize(10), fontWeight: '800', color: COLORS.grey, letterSpacing: 1 },
  sectionHeading: {
    fontSize: normalize(11),
    fontWeight: '900',
    color: COLORS.grey,
    letterSpacing: 1.5,
    marginTop: verticalScale(24),
    marginBottom: verticalScale(16),
  },
  impactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(24),
  },
  impactSquare: {
    flex: 0.31,
    height: scale(90),
    borderRadius: BORDER_RADIUS.l,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  impactValSmall: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary, marginTop: 4 },
  impactLabelSmall: { fontSize: normalize(8), fontWeight: '800', color: COLORS.grey, letterSpacing: 0.5 },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    marginBottom: verticalScale(10),
    ...SHADOWS.soft,
  },
  settingIconBox: {
    width: scale(40),
    height: scale(40),
    backgroundColor: COLORS.white,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.m,
  },
  settingTextContainer: { flex: 1 },
  settingTitle: { fontSize: normalize(15), fontWeight: '800', color: COLORS.primary },
  settingSubtitle: { fontSize: normalize(12), fontWeight: '600', color: COLORS.grey },
  footerWrapper: { marginTop: verticalScale(20), alignItems: 'center' },
  logoutButton: {
    width: '100%',
    height: verticalScale(54),
    borderRadius: BORDER_RADIUS.m,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  logoutText: { fontSize: normalize(15), fontWeight: '900', color: COLORS.error },
  versionText: { fontSize: normalize(10), fontWeight: '700', color: COLORS.divider, letterSpacing: 0.5 },
  activeSection: { marginBottom: verticalScale(32) },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: verticalScale(16) },
  pulseContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(46, 204, 113, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, marginRight: 6 },
  liveLabel: { fontSize: normalize(9), fontWeight: '900', color: COLORS.success, letterSpacing: 1 },
  activeScroll: { paddingRight: SPACING.l },
  activeBookingCard: {
      width: scale(200),
      backgroundColor: COLORS.lightGrey,
      borderRadius: BORDER_RADIUS.l,
      padding: SPACING.m,
      marginRight: SPACING.m,
      flexDirection: 'row',
      alignItems: 'center',
      ...SHADOWS.soft,
  },
  bookingIcon: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12 
  },
  bookingToolName: { fontSize: normalize(14), fontWeight: '800', color: COLORS.primary },
  bookingStatus: { fontSize: normalize(11), fontWeight: '600', color: COLORS.grey, marginTop: 2 },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    padding: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    marginTop: verticalScale(10),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.1)',
    gap: 12,
  },
  verificationIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: normalize(14),
    fontWeight: '800',
    color: COLORS.error,
  },
  verificationSub: {
    fontSize: normalize(11),
    fontWeight: '600',
    color: COLORS.grey,
  },
});
