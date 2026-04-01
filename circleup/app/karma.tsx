import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { Shimmer } from '../components/common/Shimmer';
import { api } from '../services/api';

interface KarmaHistoryItem {
  id: string;
  type: string;
  label: string;
  points: string;
  date: string;
}


const HistoryItem = ({ item, index }: { item: KarmaHistoryItem, index: number }) => (
  <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} style={styles.historyRow}>
    <View style={[styles.iconBox, { backgroundColor: item.type === 'earned' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(0, 122, 255, 0.1)' }]}>
        <Ionicons 
            name={item.type === 'earned' ? 'trending-up' : 'trending-down'} 
            size={scale(20)} 
            color={item.type === 'earned' ? COLORS.success : COLORS.primary} 
        />
    </View>
    <View style={styles.historyInfo}>
        <Text style={styles.historyLabel} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.historyDate}>{item.date}</Text>
    </View>
    <Text style={[styles.pointsText, { color: item.type === 'earned' ? COLORS.success : COLORS.primary }]}>
        {item.points}
    </Text>
  </Animated.View>
);

const KarmaSkeleton = () => (
    <View style={styles.historyRow}>
        <Shimmer width={40} height={40} borderRadius={10} style={{ marginRight: 12 }} />
        <View style={{ flex: 1 }}>
            <Shimmer width="60%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
            <Shimmer width="30%" height={12} borderRadius={4} />
        </View>
        <Shimmer width="15%" height={24} borderRadius={4} />
    </View>
);

export default function KarmaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<KarmaHistoryItem[]>([]);
  const [karmaPoints, setKarmaPoints] = useState(0);

  useEffect(() => {
    let isActive = true;
    (async () => {
        setLoading(true);
        try {
            const [historyRes, pointsRes] = await Promise.all([
                api.get('/karma/history'),
                api.get('/karma/me')
            ]);
            if (isActive) {
                setHistory(historyRes.data || []);
                setKarmaPoints(pointsRes.data.karma_points || 0);
            }
        } catch (e) {
            console.error('Failed to fetch karma data', e);
        } finally {
            if (isActive) setTimeout(() => setLoading(false), 800);
        }
    })();
    return () => { isActive = false; };
  }, []);

  const renderHeader = () => (
    <View style={styles.headerArea}>
        <View style={styles.pointHero}>
            <Text style={styles.pointValue}>{karmaPoints}</Text>
            <Text style={styles.pointLabel}>AVAILABLE KARMA</Text>
        </View>
        
        <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="card-outline" size={scale(24)} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Redeem</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="share-social-outline" size={scale(24)} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="gift-outline" size={scale(24)} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Perks</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>TRANSACTION HISTORY</Text>
    </View>
  );

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} backgroundColor={COLORS.primary} scrollable={false} edgeToEdge={true}>
      <StatusBar style="light" />
      
      <View style={[styles.nav, { paddingTop: insets.top + verticalScale(15) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>My Wallet</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <View style={styles.body}>
        <FlatList
          data={loading ? ([1, 2, 3, 4, 5] as any) : history}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item, index }) => (typeof item === 'number') ? (
            <KarmaSkeleton />
          ) : (
            <HistoryItem item={item} index={index} />
          )}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="wallet-outline" size={scale(60)} color={COLORS.divider} />
                <Text style={styles.emptyTitle}>Wallet is empty</Text>
                <Text style={styles.emptySub}>Start sharing tools to earn Karma points!</Text>
            </View>
          }
        />
      </View>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingBottom: verticalScale(20),
    backgroundColor: COLORS.primary,
  },
  backBtn: { padding: scale(5) },
  navTitle: { fontSize: normalize(20), fontWeight: '900', color: COLORS.white },
  body: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  listContent: {
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(40),
  },
  headerArea: { marginBottom: verticalScale(20) },
  pointHero: {
      alignItems: 'center',
      marginBottom: verticalScale(40),
  },
  pointValue: { fontSize: normalize(64), fontWeight: '900', color: COLORS.primary, letterSpacing: -2 },
  pointLabel: { fontSize: normalize(12), fontWeight: '900', color: COLORS.grey, letterSpacing: 2 },
  actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: verticalScale(48),
  },
  actionBtn: {
      flex: 0.31,
      height: verticalScale(90),
      backgroundColor: COLORS.lightGrey,
      borderRadius: BORDER_RADIUS.l,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.soft,
  },
  actionBtnText: { fontSize: normalize(12), fontWeight: '800', color: COLORS.primary, marginTop: 8 },
  sectionTitle: { fontSize: normalize(11), fontWeight: '900', color: COLORS.divider, letterSpacing: 1.5, marginBottom: verticalScale(24) },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  iconBox: {
      width: scale(44),
      height: scale(44),
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.m,
  },
  historyInfo: { flex: 1 },
  historyLabel: { fontSize: normalize(15), fontWeight: '800', color: COLORS.primary },
  historyDate: { fontSize: normalize(12), color: COLORS.grey, fontWeight: '600', marginTop: 2 },
  pointsText: { fontSize: normalize(16), fontWeight: '900' },
  emptyState: { alignItems: 'center', marginTop: verticalScale(60), paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: normalize(18), fontWeight: '800', color: COLORS.primary, marginTop: SPACING.m },
  emptySub: { fontSize: normalize(14), color: COLORS.grey, textAlign: 'center', marginTop: SPACING.s },
});
