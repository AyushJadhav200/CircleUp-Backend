import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AdaptiveScreen } from '../../components/common/AdaptiveScreen';
import { api } from '../../services/api';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../../constants/theme';
import { Shimmer } from '../../components/common/Shimmer';

const ToolCard = ({ item, onPress, width, onLike, isLiked, itemIndex }: { item: any; onPress: () => void; width: number; onLike: () => void; isLiked: boolean; itemIndex: number }) => (
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
          recyclingKey={`tool-${item.id}`}
          transition={200}
          priority={itemIndex < 4 ? "high" : "normal"}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />
        <View style={styles.priceBadge}>
            <Text style={styles.priceText}>₹{item.price_per_day}/d</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.likeBtn} 
          onPress={(e) => {
            e.stopPropagation();
            onLike();
          }}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={scale(20)} 
            color={isLiked ? COLORS.error : COLORS.white} 
          />
        </TouchableOpacity>
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

export default function CategoryScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [tools, setTools] = useState<any[]>([]);
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Normalize string to fix match mismatches e.g. "Power Tools" -> "powertools" compared
  const queryStr = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const isSearch = queryStr.startsWith('search_');
  const actualQuery = isSearch ? queryStr.replace('search_', '') : queryStr;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchTools = async () => {
        setLoading(true);
        try {
          const isTypeFilter = queryStr.startsWith('type_');
          const typeValue = isTypeFilter ? queryStr.replace('type_', '') : '';
          
          const [toolsRes, wishlistRes] = await Promise.all([
            api.get('/tools/', { params: { item_type: typeValue || undefined } }),
            api.get('/tools/wishlist')
          ]);
          
          if (!isActive) return;
          
          let fetchedTools = toolsRes.data || [];
          const wishlist = wishlistRes.data || [];
          setLikedIds(wishlist.map((i: any) => i.tool_id).filter(Boolean));
          
          if (isSearch) {
              fetchedTools = fetchedTools.filter((t: any) => 
                t.name.toLowerCase().includes(actualQuery.toLowerCase()) || 
                (t.description && t.description.toLowerCase().includes(actualQuery.toLowerCase()))
              );
          } else if (!isTypeFilter && actualQuery !== 'All') {
              fetchedTools = fetchedTools.filter((t: any) => 
                (t.category || '').toLowerCase().replace(' ', '') === actualQuery.toLowerCase().replace(' ', '')
              );
          }
          
          setTools(fetchedTools);
        } catch (e) {
          console.error('Failed to fetch tools', e);
          if (isActive) setTools([]);
        } finally {
          if (isActive) setTimeout(() => setLoading(false), 500); 
        }
      };

      fetchTools();
      return () => { isActive = false; };
    }, [queryStr])
  );

  return (
    <AdaptiveScreen style={styles.mainContainer} horizontalPadding={0} scrollable={false} backgroundColor="#F8F9FA">
      <StatusBar style="dark" />
      
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
           {isSearch ? `Results for "${actualQuery}"` : actualQuery}
        </Text>
        <View style={{ width: scale(40) }} />
      </View>

      <FlatList
        data={loading ? [1, 2, 3, 4] : tools}
        numColumns={2}
        keyExtractor={(item, index) => index.toString()}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        renderItem={({ item, index }) => loading ? (
          <VaultSkeleton width={width} />
        ) : (
          <ToolCard 
            item={item} 
            width={width} 
            itemIndex={index}
            onPress={() => router.push(`/tool-details?id=${item.id}`)} 
            isLiked={likedIds.includes(item.id)}
            onLike={async () => {
              try {
                const res = await api.post('/tools/wishlist/toggle', { tool_id: item.id });
                if (res.data.status === 'added') {
                   setLikedIds([...likedIds, item.id]);
                } else {
                   setLikedIds(likedIds.filter(id => id !== item.id));
                }
              } catch (err) {
                console.error('Wishlist toggle error:', err);
              }
            }}
          />
        )}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name={queryStr.includes('Cloths') ? "tshirt-crew-outline" : queryStr.includes('Jwellery') ? "necklace" : "toolbox-outline"} 
                  size={scale(60)} 
                  color={COLORS.divider} 
                />
                <Text style={styles.emptyTitle}>
                  No {queryStr.includes('Cloths') ? "cloths" : queryStr.includes('Jwellery') ? "jwellery" : "tools"} found
                </Text>
                <Text style={styles.emptySub}>
                  Nobody has listed {queryStr.includes('Cloths') ? "items" : "tools"} in this section yet.
                </Text>
            </View>
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
  priceBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: 'rgba(0,26,51,0.85)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BORDER_RADIUS.s,
  },
  likeBtn: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      padding: 6,
      borderRadius: scale(15),
      backdropFilter: 'blur(4px)',
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
});
