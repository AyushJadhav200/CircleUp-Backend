import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { api } from '../../services/api';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../../constants/theme';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { useToast } from '../../components/common/ToastProvider';
import { useCart } from '../../components/common/CartProvider';

export default function ProductDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const { width } = useWindowDimensions();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await api.get(`/shop/products/${id}`);
        setProduct(res.data);
      } catch (e) {
        showToast('Failed to load product details', 'error');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* IMAGE HEADER */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image_url }} style={styles.image} />
          <TouchableOpacity 
            style={[styles.backBtn, { top: insets.top + 10 }]} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{product.category.toUpperCase()}</Text>
            </View>
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>IN STOCK ({product.stock_quantity})</Text>
            </View>
          </View>

          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>₹{product.price}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          <View style={styles.infoSpecs}>
             <View style={styles.specItem}>
                <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
                <Text style={styles.specText}>Quality Guaranteed</Text>
             </View>
             <View style={styles.specItem}>
                <Ionicons name="flash" size={20} color={COLORS.accent} />
                <Text style={styles.specText}>Same-day Delivery</Text>
             </View>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER ACTION */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.l }]}>
        <TouchableOpacity 
          style={styles.buyButton} 
          onPress={() => {
            addToCart(product, 'product');
            showToast('Added to cart!', 'success');
            router.push('/cart' as any);
          }}
        >
          <Text style={styles.buyButtonText}>ADD TO CART</Text>
          <Ionicons name="cart-outline" size={20} color="white" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  imageContainer: { width: '100%', height: scale(350), position: 'relative' },
  image: { width: '100%', height: '100%' },
  backBtn: { 
    position: 'absolute', 
    left: 20, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  content: { padding: SPACING.l, marginTop: -20, backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  categoryBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryText: { fontSize: normalize(10), fontWeight: '900', color: COLORS.primary },
  stockBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockText: { fontSize: normalize(10), fontWeight: '900', color: '#1B5E20' },
  name: { fontSize: normalize(26), fontWeight: '900', color: COLORS.primary, marginBottom: 8 },
  price: { fontSize: normalize(24), fontWeight: '900', color: COLORS.primary, marginBottom: 20 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 20 },
  sectionTitle: { fontSize: normalize(14), fontWeight: '900', color: COLORS.divider, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  description: { fontSize: normalize(16), color: COLORS.grey, lineHeight: 24, fontWeight: '500', marginBottom: 30 },
  infoSpecs: { gap: 12 },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  specText: { fontSize: normalize(14), fontWeight: '700', color: COLORS.primary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    padding: SPACING.l,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    ...SHADOWS.medium,
  },
  buyButton: {
    backgroundColor: COLORS.primary,
    height: verticalScale(60),
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  buyButtonText: { color: 'white', fontSize: normalize(16), fontWeight: '900', letterSpacing: 1 },
});
