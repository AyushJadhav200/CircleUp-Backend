import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AdaptiveScreen } from '../../components/common/AdaptiveScreen';
import { api } from '../../services/api';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../../constants/theme';
import { ProductCard } from '../../components/shop/ProductCard';

const SHOP_CATEGORIES = ['All', 'Safety', 'Consumables', 'Maintenance', 'Gear'];

export default function ShopScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/shop/products', {
        params: { category: selectedCategory }
      });
      setProducts(res.data);
    } catch (e) {
      console.error('Failed to fetch products', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>CircleStore</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/cart')}>
          <Ionicons name="cart-outline" size={scale(24)} color={COLORS.primary} />
          <View style={styles.cartBadge} />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>Essentials, safety gear, and more for your next project.</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={scale(18)} color={COLORS.grey} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search for essentials..."
          placeholderTextColor={COLORS.grey}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        horizontal
        data={SHOP_CATEGORIES}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.catPill, selectedCategory === item && styles.catPillActive]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[styles.catPillText, selectedCategory === item && styles.catPillTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={item => item}
      />
    </View>
  );

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} scrollable={false} backgroundColor={COLORS.white}>
      <StatusBar style="dark" />
      
      <FlatList
        data={filteredProducts}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <ProductCard 
            item={item} 
            onPress={() => router.push(`/shop/${item.id}` as any)} 
          />
        )}
        keyExtractor={item => item.id.toString()}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="shopping-outline" size={scale(48)} color={COLORS.divider} />
              <Text style={styles.emptyText}>No products found in this category.</Text>
            </View>
          )
        }
      />
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: verticalScale(40) },
  header: { paddingHorizontal: SPACING.l, paddingTop: verticalScale(10) },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginLeft: -scale(10) },
  backBtn: { padding: 10 },
  title: { fontSize: normalize(30), fontWeight: '900', color: COLORS.primary, letterSpacing: -1 },
  cartBtn: { width: scale(40), height: scale(40), justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: COLORS.lightGrey },
  cartBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent, borderWidth: 1, borderColor: COLORS.white },
  subtitle: { fontSize: normalize(14), color: COLORS.grey, fontWeight: '600', marginBottom: verticalScale(20), lineHeight: 20 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    height: verticalScale(50),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: normalize(15), color: COLORS.primary, fontWeight: '600' },
  catList: { paddingBottom: verticalScale(20), gap: 8 },
  catPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.lightGrey, borderWidth: 1, borderColor: 'transparent' },
  catPillActive: { backgroundColor: COLORS.primary, ...SHADOWS.soft },
  catPillText: { fontSize: normalize(13), fontWeight: '700', color: COLORS.primary },
  catPillTextActive: { color: COLORS.white },
  listContent: { paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: SPACING.l },
  emptyState: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
  emptyText: { fontSize: normalize(14), fontWeight: '700', color: COLORS.grey, marginTop: 12 },
});
