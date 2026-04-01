import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { api } from '../services/api';

const ImpactStat = ({ icon, label, value, unit, color, delay }: { icon: any, label: string, value: string, unit: string, color: string, delay: number }) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.statCard}>
    <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon} size={scale(28)} color={color} />
    </View>
    <View style={styles.statContent}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  </Animated.View>
);

export default function ImpactScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/expansion/impact/stats');
        setStats(res.data);
      } catch (e) {
        console.error('Failed to fetch impact stats', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withRepeat(withSequence(withTiming(1.1, { duration: 1500 }), withTiming(1, { duration: 1500 })), -1, true) }],
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Calculating your impact...</Text>
      </View>
    );
  }

  return (
    <AdaptiveScreen 
      style={styles.container} 
      horizontalPadding={0} 
      scrollable={true}
      backgroundColor={COLORS.white}
    >
      <StatusBar style="dark" />
      
      {/* Premium Header */}
      <LinearGradient 
        colors={[COLORS.primary, '#4B527E']} 
        style={[styles.headerGradient, { height: verticalScale(280) }]}
      >
        <Animated.View entering={FadeInUp.duration(600)} style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={scale(24)} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Environment Impact</Text>
          <View style={{ width: scale(40) }} />
        </Animated.View>

        <View style={styles.heroContainer}>
          <Animated.View style={[styles.badgeContainer, pulseStyle]}>
             <MaterialCommunityIcons name="leaf-circle" size={scale(100)} color={COLORS.accent} />
          </Animated.View>
          <Animated.Text entering={ZoomIn.delay(300)} style={styles.rankTitle}>
            {stats?.karma_rank || 'Eco Hero'}
          </Animated.Text>
          <Text style={styles.rankPoints}>{stats?.karma_points || 0} IMPACT POINTS</Text>
        </View>
      </LinearGradient>

      {/* Stats Grid */}
      <View style={styles.content}>
        <View style={styles.statsGrid}>
          <ImpactStat 
            delay={400} 
            icon="molecule-co2" 
            label="CO2 Emissions Saved" 
            value={stats?.co2_saved?.toString() || '0'} 
            unit="kg" 
            color="#2ECC71" 
          />
          <ImpactStat 
            delay={600} 
            icon="currency-usd" 
            label="Community Money Saved" 
            value={stats?.money_saved?.toString() || '0'} 
            unit="USD" 
            color="#3498DB" 
          />
          <ImpactStat 
            delay={800} 
            icon="recycle" 
            label="Waste Diverted" 
            value={stats?.waste_diverted?.toString() || '0'} 
            unit="kg" 
            color="#F1C40F" 
          />
          <ImpactStat 
            delay={1000} 
            icon="hand-heart" 
            label="Neighbors Helped" 
            value={stats?.neighbors_helped?.toString() || '0'} 
            unit="users" 
            color="#E74C3C" 
          />
        </View>

        {/* Impact Story */}
        <Animated.View entering={FadeInDown.delay(1200)} style={styles.storyCard}>
            <Text style={styles.storyHeader}>YOUR CONTRIBUTION</Text>
            <Text style={styles.storyText}>
              By sharing instead of buying, you have prevented the production of new tools, significantly reducing the demand for raw materials and energy.
            </Text>
            <View style={styles.comparisonRow}>
               <View style={styles.comparisonItem}>
                  <Ionicons name="car" size={scale(24)} color={COLORS.primary} />
                  <Text style={styles.comparisonLabel}>Equivalent to {(stats?.co2_saved / 0.4).toFixed(0)} km of driving</Text>
               </View>
               <View style={styles.divider} />
               <View style={styles.comparisonItem}>
                  <Ionicons name="trash" size={scale(24)} color={COLORS.primary} />
                  <Text style={styles.comparisonLabel}>Equivalent to {(stats?.waste_diverted / 0.5).toFixed(0)} trash bags</Text>
               </View>
            </View>
        </Animated.View>
        
        <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>Share My Impact</Text>
            <Ionicons name="share-social" size={scale(20)} color={COLORS.white} />
        </TouchableOpacity>

        <View style={{ height: verticalScale(40) }} />
      </View>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { fontSize: normalize(16), fontWeight: '700', color: COLORS.primary },
  
  headerGradient: { width: '100%', paddingHorizontal: SPACING.l, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, ...SHADOWS.medium },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: verticalScale(40) },
  backBtn: { width: scale(40), height: scale(40), backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.white, letterSpacing: 0.5 },
  
  heroContainer: { alignItems: 'center', marginTop: verticalScale(20) },
  badgeContainer: { marginBottom: 10 },
  rankTitle: { fontSize: normalize(32), fontWeight: '900', color: COLORS.white, textAlign: 'center' },
  rankPoints: { fontSize: normalize(14), fontWeight: '800', color: COLORS.accent, letterSpacing: 1, marginTop: 4 },

  content: { paddingHorizontal: SPACING.l, marginTop: -verticalScale(30) },
  statsGrid: { gap: SPACING.m },
  statCard: { 
    flexDirection: 'row', 
    backgroundColor: COLORS.white, 
    borderRadius: BORDER_RADIUS.l, 
    padding: SPACING.m, 
    alignItems: 'center', 
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  statIconBox: { width: scale(56), height: scale(56), borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
  statContent: { flex: 1 },
  statLabel: { fontSize: normalize(12), fontWeight: '700', color: COLORS.grey, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  statValue: { fontSize: normalize(24), fontWeight: '900', color: COLORS.primary, marginRight: 4 },
  statUnit: { fontSize: normalize(14), fontWeight: '700', color: COLORS.primary, opacity: 0.6 },

  storyCard: { 
    marginTop: verticalScale(30), 
    backgroundColor: '#F8F9FA', 
    borderRadius: BORDER_RADIUS.l, 
    padding: SPACING.l, 
    borderWidth: 1, 
    borderColor: '#F0F0F0' 
  },
  storyHeader: { fontSize: normalize(11), fontWeight: '900', color: COLORS.grey, letterSpacing: 1.5, marginBottom: 12 },
  storyText: { fontSize: normalize(14), fontWeight: '600', color: COLORS.primary, lineHeight: 22, marginBottom: 20 },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  comparisonItem: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  comparisonLabel: { fontSize: normalize(10), fontWeight: '700', color: COLORS.grey, textAlign: 'center', marginTop: 8 },
  divider: { width: 1, height: '80%', backgroundColor: COLORS.divider },

  shareBtn: { 
    marginTop: verticalScale(30), 
    height: verticalScale(60), 
    backgroundColor: COLORS.primary, 
    borderRadius: BORDER_RADIUS.l, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 12,
    ...SHADOWS.medium 
  },
  shareBtnText: { fontSize: normalize(16), fontWeight: '900', color: COLORS.white }
});
