import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { useCart, CartItem } from '../components/common/CartProvider';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';

const CartItemRow = ({ item, onRemove, onUpdateQty }: { 
  item: CartItem; 
  onRemove: (id: number) => void; 
  onUpdateQty: (id: number, delta: number) => void;
}) => (
  <View style={styles.cartItem}>
    <Image source={{ uri: item.image_url }} style={styles.itemImage} />
    <View style={styles.itemInfo}>
      <Text style={styles.itemCategory}>{item.category.toUpperCase()}</Text>
      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.itemPrice}>₹{item.price}{item.type === 'tool' ? '/day' : ''}</Text>
    </View>
    <View style={styles.itemActions}>
      {item.type === 'product' ? (
        <View style={styles.qtyContainer}>
          <TouchableOpacity onPress={() => onUpdateQty(item.id, -1)} style={styles.qtyBtn}>
            <Ionicons name="remove" size={16} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => onUpdateQty(item.id, 1)} style={styles.qtyBtn}>
            <Ionicons name="add" size={16} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.rentalBadge}>
          <Text style={styles.rentalText}>{item.rental_days || 1} day(s)</Text>
        </View>
      )}
      <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.removeBtn}>
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  </View>
);

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, removeFromCart, updateQuantity, totalPrice, totalItems, clearCart } = useCart();

  const handleCheckout = () => {
    if (cart.length === 0) return;
    router.push('/checkout/order-summary' as any);
  };

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} scrollable={false} backgroundColor="#F8F9FA">
      <StatusBar style="dark" />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Cart</Text>
        <TouchableOpacity onPress={clearCart} disabled={cart.length === 0}>
          <Text style={[styles.clearText, cart.length === 0 && { opacity: 0.3 }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={({ item }) => (
          <CartItemRow 
            item={item} 
            onRemove={removeFromCart} 
            onUpdateQty={updateQuantity} 
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cart-outline" size={scale(80)} color={COLORS.divider} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Add some tools from the Vault or essentials from the Store.</Text>
            <TouchableOpacity style={styles.startBtn} onPress={() => router.push('/(tabs)/vault')}>
              <Text style={styles.startBtnText}>Start Exploring</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FOOTER */}
      {cart.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.l }]}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total ({totalItems} items)</Text>
            <Text style={styles.totalValue}>₹{totalPrice}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <Text style={styles.checkoutBtnText}>PROCEED TO CHECKOUT</Text>
            <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: SPACING.m,
    backgroundColor: COLORS.white,
    ...SHADOWS.soft,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: normalize(20), fontWeight: '900', color: COLORS.primary },
  clearText: { fontSize: normalize(14), fontWeight: '700', color: COLORS.error },
  listContent: { padding: SPACING.l, paddingBottom: 120 },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  itemImage: { width: scale(60), height: scale(60), borderRadius: BORDER_RADIUS.m },
  itemInfo: { flex: 1, marginLeft: 12, flexShrink: 1 },
  itemCategory: { fontSize: normalize(9), fontWeight: '900', color: COLORS.grey, letterSpacing: 0.5 },
  itemName: { fontSize: normalize(16), fontWeight: '800', color: COLORS.primary, marginVertical: 2 },
  itemPrice: { fontSize: normalize(14), fontWeight: '700', color: COLORS.primary },
  itemActions: { alignItems: 'flex-end', gap: 8 },
  qtyContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.lightGrey, 
    borderRadius: 8,
    padding: 4
  },
  qtyBtn: { width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: normalize(13), fontWeight: '800', color: COLORS.primary, marginHorizontal: 8 },
  rentalBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rentalText: { fontSize: normalize(10), fontWeight: '900', color: COLORS.primary },
  removeBtn: { padding: 4 },
  emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: normalize(22), fontWeight: '900', color: COLORS.primary, marginTop: 20 },
  emptySub: { fontSize: normalize(14), color: COLORS.grey, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  startBtn: { 
    marginTop: 30, 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 20 
  },
  startBtnText: { color: 'white', fontWeight: '800', fontSize: normalize(14) },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    ...SHADOWS.medium,
    height: verticalScale(130),
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.m },
  totalLabel: { fontSize: normalize(14), fontWeight: '700', color: COLORS.grey },
  totalValue: { fontSize: normalize(22), fontWeight: '900', color: COLORS.primary },
  checkoutBtn: {
    backgroundColor: COLORS.primary,
    height: verticalScale(56),
    borderRadius: BORDER_RADIUS.m,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  checkoutBtnText: { color: 'white', fontSize: normalize(15), fontWeight: '900', letterSpacing: 1 },
});
