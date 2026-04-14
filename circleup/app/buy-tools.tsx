import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { api } from '../services/api';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { Shimmer } from '../components/common/Shimmer';

const CATEGORIES = ['All', 'Drills', 'Ladders', 'Garden', 'Cleaning', 'Automotive', 'Power Tools'];

const SaleToolCard = ({ item, onPress, width }: { item: any; onPress: () => void; width: number }) => (
  <TouchableOpacity 
    style={[styles.card, { width: (width - SPACING.l * 2 - SPACING.m) / 2 }]} 
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.imageWrapper}>
        <Image 
          source={{ uri: item.image_url || 'https://images.unsplash.com/photo-1504147622584-7a15a3df73d4?q=80&w=400' }} 
          style={styles.cardImage}
          contentFit="cover"
          cachePolicy="disk"
          recyclingKey={`sale-${item.id}`}
          transition={200}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
        <View style={styles.priceBadge}>
            <Text style={styles.priceText}>₹{item.sale_price}</Text>
        </View>
    </View>
    <View style={styles.cardInfo}>
      <Text style={styles.cardCategory}>{item.category?.toUpperCase() || 'EQUIPMENT'}</Text>
      <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
      <View style={styles.cardFooter}>
         <View style={styles.ownerRow}>
            <Ionicons name="person-circle-outline" size={normalize(12)} color={COLORS.grey} />
            <Text style={styles.statText}>{item.owner_name || 'Community'}</Text>
         </View>
      </View>
    </View>
  </TouchableOpacity>
);

const VaultSkeleton = ({ width }: { width: number }) => (
  <View style={[styles.card, { width: (width - SPACING.l * 2 - SPACING.m) / 2 }]}>
    <Shimmer width="100%" height={verticalScale(140)} borderRadius={BORDER_RADIUS.l} style={{ marginBottom: 12 }} />
    <Shimmer width="40%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
    <Shimmer width="90%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
    <Shimmer width="60%" height={16} borderRadius={4} />
  </View>
);

export default function BuyToolsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchTools = async () => {
        setLoading(true);
        try {
          const res = await api.get('/tools/nearby', {
            params: {
              lat: 28.5355, // Default Center
              lon: 77.3910,
              radius: 50.0, // Wider range for marketplace
              category: selectedCategory === 'All' ? undefined : selectedCategory,
              query: searchQuery || undefined
            }
          });
          // Filter out tools that don't have a sale_price
          const saleTools = (res.data || []).filter((t: any) => t.sale_price && t.sale_price > 0);
          if (isActive) setTools(saleTools);
        } catch (e) {
          console.error('Failed to fetch tools', e);
          if (isActive) setTools([]);
        } finally {
          if (isActive) setTimeout(() => setLoading(false), 500); 
        }
      };

      fetchTools();
      return () => { isActive = false; };
    }, [selectedCategory, searchQuery])
  );

  const displayTools = tools; // No longer locally filtered

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.titleRow}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Marketplace</Text>
      </View>

      <Text style={styles.headerSubtitle}>Buy pre-owned tools from neighbors</Text>
      
      {/* 🚀 PRO-SHOP BANNER (NEW) */}
      <TouchableOpacity 
        style={styles.shopBanner} 
        activeOpacity={0.9} 
        onPress={() => router.push('/shop' as any)}
      >
        <View style={styles.shopTextContainer}>
          <Text style={styles.shopBadge}>OFFICIAL STORE</Text>
          <Text style={styles.shopTitle}>Need Essentials?</Text>
          <Text style={styles.shopSub}>Buy bits, blades & safety gear</Text>
        </View>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?q=80&w=200' }} 
          style={styles.shopImg} 
        />
        <View style={styles.shopArrow}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
        </View>
      </TouchableOpacity>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={scale(18)} color={COLORS.grey} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search for tools to buy..."
          placeholderTextColor={COLORS.grey}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.catPill, selectedCategory === item && styles.activeCatPill]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[styles.catPillText, selectedCategory === item && styles.activeCatPillText]}>{item}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
      />
    </View>
  );

  return (
    <AdaptiveScreen style={styles.mainContainer} horizontalPadding={0} scrollable={false} backgroundColor={COLORS.white}>
      <StatusBar style="dark" />
      
      <FlatList
        data={loading ? [1, 2, 3, 4] : displayTools}
        numColumns={2}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => loading ? (
          <VaultSkeleton width={width} />
        ) : (
          <SaleToolCard item={item} width={width} onPress={() => router.push(`/tool-details?id=${item.id}`)} />
        )}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <MaterialCommunityIcons name="cart-remove" size={scale(60)} color={COLORS.divider} />
                <Text style={styles.emptyTitle}>Nothing for sale yet</Text>
                <Text style={styles.emptySub}>Check back later or rent tools from the Vault.</Text>
            </View>
        }
      />
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, paddingTop: verticalScale(40) },
  listContainer: { paddingBottom: verticalScale(100) },
  headerContent: { paddingHorizontal: SPACING.l, paddingTop: verticalScale(20), marginBottom: verticalScale(10) },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: -scale(10) },
  backBtn: { padding: 10, marginRight: 4 },
  headerTitle: { fontSize: normalize(32), fontWeight: '900', color: COLORS.primary, letterSpacing: -1 },
  headerSubtitle: { fontSize: normalize(15), color: COLORS.grey, fontWeight: '600', marginBottom: verticalScale(20) },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    height: verticalScale(54),
    marginBottom: verticalScale(20),
    ...SHADOWS.soft,
  },
  searchInput: { flex: 1, marginLeft: SPACING.s, fontSize: normalize(15), color: COLORS.primary, fontWeight: '600' },
  catList: { paddingBottom: verticalScale(10) },
  catPill: {
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.lightGrey,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeCatPill: { backgroundColor: COLORS.primary, ...SHADOWS.medium },
  catPillText: { fontSize: normalize(13), fontWeight: '700', color: COLORS.primary },
  activeCatPillText: { color: COLORS.white },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: SPACING.l, marginBottom: SPACING.m },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.s,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imageWrapper: { width: '100%', height: verticalScale(140), borderRadius: BORDER_RADIUS.m, overflow: 'hidden', marginBottom: 12 },
  cardImage: { width: '100%', height: '100%' },
  priceBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: COLORS.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.s,
  },
  priceText: { color: COLORS.white, fontSize: normalize(11), fontWeight: '900' },
  cardInfo: { paddingHorizontal: 4 },
  cardCategory: { fontSize: normalize(9), fontWeight: '900', color: COLORS.accent, letterSpacing: 0.5, marginBottom: 4 },
  cardName: { fontSize: normalize(14), fontWeight: '800', color: COLORS.primary, height: normalize(40), lineHeight: normalize(18) },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  ownerRow: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: normalize(11), fontWeight: '700', color: COLORS.primary, marginLeft: 2 },
  emptyState: { alignItems: 'center', marginTop: verticalScale(60), paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: normalize(18), fontWeight: '800', color: COLORS.primary, marginTop: SPACING.m },
  emptySub: { fontSize: normalize(14), color: COLORS.grey, textAlign: 'center', marginTop: SPACING.s },
  shopBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0F7FF',
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    marginBottom: verticalScale(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D0E4FF',
    ...SHADOWS.soft,
  },
  shopTextContainer: { flex: 1 },
  shopBadge: { 
    fontSize: normalize(8), 
    fontWeight: '900', 
    color: COLORS.primary, 
    backgroundColor: COLORS.accent, 
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  shopTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  shopSub: { fontSize: normalize(11), fontWeight: '600', color: COLORS.grey, marginTop: 2 },
  shopImg: { width: scale(60), height: scale(60), borderRadius: BORDER_RADIUS.m, marginLeft: 12 },
  shopArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    ...SHADOWS.soft,
  },
});
