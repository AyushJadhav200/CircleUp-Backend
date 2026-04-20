import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { api } from '../services/api';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { Shimmer } from '../components/common/Shimmer';
import { Image } from 'expo-image';

const ToolCard = ({ item, onPress, width, onLike }: { item: any; onPress: () => void; width: number; onLike: () => void }) => (
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
          transition={200}
        />
        <TouchableOpacity 
          style={styles.likeBtn} 
          onPress={(e) => {
            e.stopPropagation();
            onLike();
          }}
        >
          <Ionicons name="heart" size={scale(20)} color={COLORS.error} />
        </TouchableOpacity>
    </View>
    <View style={styles.cardInfo}>
      <Text style={styles.cardCategory}>{item.category?.toUpperCase() || 'EQUIPMENT'}</Text>
      <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
    </View>
  </TouchableOpacity>
);

export default function WishlistScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchWishlist = async () => {
        setLoading(true);
        try {
          const res = await api.get('/tools/wishlist');
          if (isActive && res.data) {
            // Flatten the response to get both tools and products
            const items = res.data.map((i: any) => {
              if (i.tool) return { ...i.tool, wishlist_type: 'tool' };
              if (i.product) return { ...i.product, wishlist_type: 'product' };
              return null;
            }).filter(Boolean);
            setWishlist(items);
          }
        } catch (e: any) {
          console.error('Failed to fetch wishlist', e);
          if (e.response?.status === 401) {
            router.replace('/');
          }
        } finally {
          if (isActive) setTimeout(() => setLoading(false), 600);
        }
      };
      fetchWishlist();
      return () => { isActive = false; };
    }, [])
  );

  const toggleLike = async (item: any) => {
    try {
      const payload = item.wishlist_type === 'product' ? { product_id: item.id } : { tool_id: item.id };
      await api.post('/tools/wishlist/toggle', payload);
      setWishlist(wishlist.filter(i => i.id !== item.id));
    } catch (err) {
      console.error('Toggle error', err);
    }
  };

  return (
    <AdaptiveScreen style={styles.mainContainer} horizontalPadding={0} scrollable={false} backgroundColor="#F8F9FA">
      <StatusBar style="dark" />
      
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <FlatList
        data={loading ? [1, 2, 3, 4] : wishlist}
        numColumns={2}
        keyExtractor={(item, index) => loading ? `shimmer_${index}` : `${item.wishlist_type}_${item.id}_${index}`}
        renderItem={({ item, index }) => loading ? (
          <View style={[styles.card, { width: (width - SPACING.l * 2 - SPACING.m) / 2 }]}>
            <Shimmer width="100%" height={verticalScale(140)} borderRadius={BORDER_RADIUS.m} style={{ marginBottom: 12 }} />
            <Shimmer width="40%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
            <Shimmer width="80%" height={18} borderRadius={4} />
          </View>
        ) : (
          <ToolCard 
            item={item} 
            width={width} 
            onPress={() => {
              const route = item.wishlist_type === 'product' ? `/shop/${item.id}` : `/tool-details?id=${item.id}`;
              router.push(route as any);
            }} 
            onLike={() => toggleLike(item)}
          />
        )}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-dislike-outline" size={scale(60)} color={COLORS.divider} />
              <Text style={styles.emptyTitle}>Wishlist is empty</Text>
              <Text style={styles.emptySub}>Save your favorite tools to find them later!</Text>
            </View>
          ) : null
        }
      />
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: SPACING.m, 
    paddingTop: verticalScale(10), 
    paddingBottom: verticalScale(15),
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider
  },
  backBtn: { padding: scale(5) },
  headerTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  listContainer: { paddingBottom: verticalScale(100), paddingTop: SPACING.l },
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
  likeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 6,
    borderRadius: scale(15),
  },
  cardInfo: { paddingHorizontal: 4 },
  cardCategory: { fontSize: normalize(9), fontWeight: '900', color: COLORS.accent, letterSpacing: 0.5, marginBottom: 4 },
  cardName: { fontSize: normalize(14), fontWeight: '800', color: COLORS.primary, height: normalize(40), lineHeight: normalize(18) },
  emptyState: { alignItems: 'center', marginTop: verticalScale(100), paddingHorizontal: SPACING.xl },
  emptyTitle: { fontSize: normalize(18), fontWeight: '800', color: COLORS.primary, marginTop: SPACING.m },
  emptySub: { fontSize: normalize(14), color: COLORS.grey, textAlign: 'center', marginTop: SPACING.s },
});
