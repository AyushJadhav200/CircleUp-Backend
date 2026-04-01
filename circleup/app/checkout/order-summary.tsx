import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AdaptiveScreen } from '../../components/common/AdaptiveScreen';
import { useCart } from '../../components/common/CartProvider';
import { useToast } from '../../components/common/ToastProvider';
import { api } from '../../services/api';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../../constants/theme';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { getDistance, calculateDeliveryFee } from '../../utils/distance';
import * as Location from 'expo-location';

export default function OrderSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cart, totalPrice, clearCart } = useCart();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [deliveryChoices, setDeliveryChoices] = useState<Record<string, boolean>>({});
  const [distances, setDistances] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Permission to access location was denied', 'error');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
    })();
  }, []);

  useEffect(() => {
    if (userLocation && cart.length > 0) {
      const newDistances: Record<string, number> = {};
      const newChoices: Record<string, boolean> = {};
      
      cart.forEach(item => {
        const key = `${item.type}-${item.id}`;
        // For tools/products, we assume they have lat/lon. If not, default to 0.5km for testing
        const itemLat = item.latitude || userLocation.latitude + 0.005; 
        const itemLon = item.longitude || userLocation.longitude + 0.005;
        
        const dist = getDistance(userLocation.latitude, userLocation.longitude, itemLat, itemLon);
        newDistances[key] = dist;
        
        // If distance > 1km, delivery is forced (true)
        if (dist > 1) {
          newChoices[key] = true;
        } else {
          newChoices[key] = false; // Default to pickup for < 1km
        }
      });
      
      setDistances(newDistances);
      setDeliveryChoices(newChoices);
    }
  }, [userLocation, cart]);

  const toggleDelivery = (key: string) => {
    const dist = distances[key];
    if (dist > 1) return; // Cannot toggle if > 1km (mandatory delivery)
    
    setDeliveryChoices(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const calculateTotalFees = () => {
    let fees = 0;
    Object.keys(deliveryChoices).forEach(key => {
      if (deliveryChoices[key]) {
        fees += calculateDeliveryFee(distances[key] || 0);
      }
    });
    return fees;
  };

  const deliveryFeeTotal = calculateTotalFees();
  const finalTotal = totalPrice + deliveryFeeTotal;

  const handlePlaceOrder = async () => {
    if (!userLocation) {
      showToast('Waiting for your location...', 'error');
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      const startDate = now.toISOString();

      // Place orders for each tool item in the cart
      const toolItems = cart.filter(i => i.type === 'tool');
      const productItems = cart.filter(i => i.type === 'product');

      for (const item of toolItems) {
        const key = `${item.type}-${item.id}`;
        const isDelivery = deliveryChoices[key] || false;
        const fee = isDelivery ? calculateDeliveryFee(distances[key] || 0) : 0;
        const endDate = new Date(now.getTime() + (item.rental_days || 1) * 86400000).toISOString();

        await api.post(`/tools/borrow?tool_id=${item.id}`, {
          start_date: startDate,
          end_date: endDate,
          is_delivery: isDelivery,
          delivery_fee: fee,
          borrower_lat: userLocation.latitude,
          borrower_lon: userLocation.longitude,
        });
      }

      // Product orders (future scope — currently logged)
      if (productItems.length > 0) {
        console.log('[CircleUp] Product orders logged. Backend integration TBD:', productItems);
      }

      showToast('🎉 Order placed! Pay on handover.', 'success');
      clearCart();
      router.replace('/(tabs)/activity');
    } catch (e: any) {
      showToast(e?.response?.data?.detail || 'Failed to place order. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} scrollable={false} backgroundColor="#F8F9FA">
      <StatusBar style="dark" />
      
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Fulfillment Options</Text>
        
        {cart.map((item) => {
          const key = `${item.type}-${item.id}`;
          const dist = distances[key] || 0;
          const isDelivery = deliveryChoices[key];
          const fee = calculateDeliveryFee(dist);
          const isMandatory = dist > 1;

          return (
            <View key={key} style={styles.orderCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDist}>{dist.toFixed(2)} km away</Text>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity 
                  style={[styles.optionBtn, !isDelivery && styles.optionBtnActive]} 
                  disabled={isMandatory}
                  onPress={() => toggleDelivery(key)}
                >
                  <MaterialCommunityIcons name="walk" size={18} color={!isDelivery ? 'white' : COLORS.grey} />
                  <Text style={[styles.optionText, !isDelivery && styles.optionTextActive]}>Self-Pickup</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.optionBtn, isDelivery && styles.optionBtnActive]} 
                  onPress={() => toggleDelivery(key)}
                >
                  <MaterialCommunityIcons name="moped" size={18} color={isDelivery ? 'white' : COLORS.grey} />
                  <Text style={[styles.optionText, isDelivery && styles.optionTextActive]}>
                    Delivery {isDelivery ? `(₹${fee})` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {isMandatory && (
                <Text style={styles.infoText}>* Mandatory delivery for distances over 1km.</Text>
              )}
            </View>
          );
        })}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Bill Details</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>₹{totalPrice}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fees</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>+₹{deliveryFeeTotal}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Tax (5%)</Text>
            <Text style={styles.summaryValue}>₹{(totalPrice * 0.05).toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{(finalTotal + totalPrice * 0.05).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.safetyBox}>
          <ShieldCheckIcon />
          <Text style={styles.safetyText}>CircleUp Protection covered for all items.</Text>
        </View>

        {/* PAYMENT METHOD */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentLeft}>
            <View style={styles.paymentIcon}>
              <Ionicons name="cash-outline" size={22} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.paymentTitle}>Cash on Handover</Text>
              <Text style={styles.paymentSub}>Pay when you collect the tool</Text>
            </View>
          </View>
          <View style={styles.paymentBadge}>
            <Text style={styles.paymentBadgeText}>SELECTED</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.l }]}>
        <TouchableOpacity 
          style={[styles.placeOrderBtn, loading && { opacity: 0.7 }]} 
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.placeOrderText}>PLACE ORDER</Text>
              <Ionicons name="checkmark-circle" size={24} color="white" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </AdaptiveScreen>
  );
}

const ShieldCheckIcon = () => (
    <View style={{ backgroundColor: '#E8F5E9', padding: 8, borderRadius: 20 }}>
        <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
    </View>
);

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
  scrollContent: { padding: SPACING.l, paddingBottom: 150 },
  sectionTitle: { fontSize: normalize(14), fontWeight: '900', color: COLORS.divider, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15 },
  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  itemName: { fontSize: normalize(16), fontWeight: '800', color: COLORS.primary, flex: 1 },
  itemDist: { fontSize: normalize(12), color: COLORS.grey, fontWeight: '700' },
  optionsRow: { flexDirection: 'row', gap: 10 },
  optionBtn: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    height: 48, 
    borderRadius: 12, 
    borderWidth: 1.5, 
    borderColor: '#F0F0F0',
    backgroundColor: '#F9F9F9'
  },
  optionBtnActive: { 
    backgroundColor: COLORS.primary, 
    borderColor: COLORS.primary,
    ...SHADOWS.medium 
  },
  optionText: { fontSize: normalize(12), fontWeight: '800', color: COLORS.grey, marginLeft: 6 },
  optionTextActive: { color: 'white' },
  infoText: { fontSize: normalize(10), color: COLORS.error, fontWeight: '700', marginTop: 10 },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    marginTop: 10,
    ...SHADOWS.soft,
  },
  summaryTitle: { fontSize: normalize(16), fontWeight: '900', color: COLORS.primary, marginBottom: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: normalize(14), fontWeight: '600', color: COLORS.grey },
  summaryValue: { fontSize: normalize(14), fontWeight: '800', color: COLORS.primary },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 15 },
  totalLabel: { fontSize: normalize(16), fontWeight: '900', color: COLORS.primary },
  totalValue: { fontSize: normalize(22), fontWeight: '900', color: COLORS.primary },
  safetyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', padding: 15, borderRadius: BORDER_RADIUS.m, marginTop: 20 },
  safetyText: { flex: 1, marginLeft: 12, fontSize: normalize(13), fontWeight: '700', color: COLORS.primary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    ...SHADOWS.medium,
  },
  placeOrderBtn: {
    backgroundColor: COLORS.primary,
    height: verticalScale(60),
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  placeOrderText: { color: 'white', fontSize: normalize(16), fontWeight: '900', letterSpacing: 1 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    marginTop: SPACING.m,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    ...SHADOWS.soft,
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTitle: { fontSize: normalize(15), fontWeight: '900', color: COLORS.primary },
  paymentSub: { fontSize: normalize(11), fontWeight: '600', color: COLORS.grey, marginTop: 2 },
  paymentBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  paymentBadgeText: { fontSize: normalize(9), fontWeight: '900', color: '#1B5E20', letterSpacing: 0.5 },
});
