import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
// @ts-ignore
import RazorpayCheckout from 'react-native-razorpay';
import { api } from '../../services/api';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../../constants/theme';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { useToast } from '../../components/common/ToastProvider';

export default function CheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, startDate, endDate } = useLocalSearchParams();
  const { showToast } = useToast();
  
  const [tool, setTool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [address, setAddress] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'wallet'>('razorpay');

  // Setup date data
  const start = new Date(startDate as string);
  const end = new Date(endDate as string);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          const [toolRes, userRes] = await Promise.all([
            api.get(`/tools/${id}`),
            api.post('/auth/me')
          ]);
          setTool(toolRes.data);
          if (userRes.data?.address) {
            setAddress(userRes.data.address);
          }
        } catch (e) {
          console.error('Fetch error:', e);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [id])
  );

  const completeBorrowing = async () => {
    try {
      await api.post('/tools/borrow', {
        tool_id: tool.id,
        start_date: startDate,
        end_date: endDate,
        is_delivery: true,
        delivery_fee: 49,
        borrower_lat: address?.lat || tool?.latitude,
        borrower_lon: address?.lon || tool?.longitude
      });
      showToast('Order placed successfully! 🎉', 'success');
      router.replace(`/checkout/success?type=rental&id=${tool.id}` as any);
    } catch (e: any) {
      if (e.response?.status === 403) {
        Alert.alert(
          "Identity Verification Required",
          "This is a high-value tool (>₹1,000). To protect our neighbors, we require a one-time ID verification before you can book it.",
          [
            { text: "Later", style: "cancel" },
            { text: "Verify Now", onPress: () => router.push('/verify-identity' as any) }
          ]
        );
      } else {
        showToast('Record creation failed', 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const rentalFee = tool ? tool.price_per_day * days : 0;
  const deliveryFee = 49;
  const platformFee = Math.round(rentalFee * 0.05); // 5% fee
  const securityDeposit = 500; // Standard refundable deposit
  const totalAmount = rentalFee + deliveryFee + platformFee + securityDeposit;

  const handlePlaceOrder = async () => {
    if (!address) {
      showToast('Please add a delivery address', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      // 1. Create Razorpay Order on Backend
      const { data } = await api.post('/payments/create-order', {
        amount: totalAmount,
        currency: 'INR'
      });

      // 2. Configure Razorpay Options
      const options = {
        description: `Rental: ${tool.name}`,
        image: 'https://circleup.app/logo.png',
        currency: data.currency,
        key: data.key_id,
        amount: data.amount,
        name: 'CircleUp Community',
        order_id: data.order_id,
        prefill: {
          email: 'user@example.com',
          contact: '9999999999',
          name: 'CircleUp User'
        },
        theme: { color: COLORS.primary }
      };

      // 3. Open Razorpay Checkout
      const response = await RazorpayCheckout.open(options);

      // 4. Verify Payment on Backend (Mandatory)
      await api.post('/payments/verify-payment', {
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      });

      // 5. If verified, create the borrow record
      completeBorrowing();

    } catch (e: any) {
      console.error(e);
      if (e.code === 2) {
        showToast('Payment cancelled', 'info');
      } else {
        showToast('Payment failed', 'error');
      }
      setSubmitting(false);
    }
  };

  if (loading || !tool) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Order Summary</Text>
          <Text style={styles.headerSub}>Step 1 of 2 • Checkout</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: verticalScale(140) }} showsVerticalScrollIndicator={false}>
        
        {/* PROGRESS BAR */}
        <View style={styles.progressContainer}>
            <View style={[styles.progressLine, { backgroundColor: COLORS.success }]} />
            <View style={[styles.progressDot, { backgroundColor: COLORS.success }]} />
            <View style={[styles.progressLine, { backgroundColor: COLORS.divider }]} />
            <View style={[styles.progressDot, { backgroundColor: COLORS.divider }]} />
        </View>

        {/* ITEM CARD */}
        <View style={styles.orderCard}>
            <Image source={{ uri: tool.image_url }} style={styles.itemImage} cachePolicy="disk" transition={200} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemCategory}>{tool.category?.toUpperCase()}</Text>
                <Text style={styles.itemName} numberOfLines={1}>{tool.name}</Text>
                <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={scale(12)} color={COLORS.primary} />
                    <Text style={styles.dateText}>{start.toLocaleDateString()} - {end.toLocaleDateString()}</Text>
                </View>
            </View>
            <View style={styles.daysBadge}>
                <Text style={styles.daysVal}>{days}</Text>
                <Text style={styles.daysLabel}>DAYS</Text>
            </View>
        </View>

        {/* DELIVERY SECTION */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>
                <TouchableOpacity onPress={() => router.push('/checkout/address')}>
                    <Text style={styles.changeText}>{address ? 'CHANGE' : 'ADD NEW'}</Text>
                </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
                style={styles.addressBox} 
                onPress={() => !address && router.push('/checkout/address')}
            >
                <View style={styles.addressIcon}>
                    <Ionicons name={address ? "location" : "add-circle"} size={scale(20)} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    {address ? (
                        <>
                            <Text style={styles.addressName}>{address.label || 'Home'}</Text>
                            <Text style={styles.addressDetails} numberOfLines={2}>
                                {address.full_address}, {address.city}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.addAddressPrompt}>Where should we deliver this tool?</Text>
                    )}
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={COLORS.divider} />
            </TouchableOpacity>
        </View>

        {/* PRICE BREAKDOWN */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>BILLING DETAILS</Text>
            <View style={styles.billCard}>
                <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Rental Fee (₹{tool.price_per_day} x {days} days)</Text>
                    <Text style={styles.billVal}>₹{rentalFee}</Text>
                </View>
                <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Service Fee (5%)</Text>
                    <Text style={styles.billVal}>₹{platformFee}</Text>
                </View>
                <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Standard Delivery Fee</Text>
                    <Text style={styles.billVal}>₹{deliveryFee}</Text>
                </View>
                <View style={styles.billRow}>
                    <Text style={styles.billLabel}>Refundable Security Deposit</Text>
                    <Text style={styles.billVal}>₹{securityDeposit}</Text>
                </View>
                
                <View style={styles.divider} />
                
                <View style={[styles.billRow, { marginTop: 8 }]}>
                    <Text style={styles.totalLabel}>Grand Total</Text>
                    <Text style={styles.totalVal}>₹{totalAmount}</Text>
                </View>
            </View>
        </View>

        {/* PAYMENT METHODS */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>PAYMENT METHOD</Text>
            <View style={styles.paymentMethods}>
                <TouchableOpacity 
                    style={[styles.methodItem, paymentMethod === 'razorpay' && styles.methodItemActive]}
                    onPress={() => setPaymentMethod('razorpay')}
                >
                    <View style={styles.methodIcon}>
                        <MaterialCommunityIcons name="credit-card-outline" size={scale(20)} color={paymentMethod === 'razorpay' ? COLORS.primary : COLORS.grey} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.methodName, paymentMethod === 'razorpay' && { color: COLORS.primary }]}>Cards / UPI / Netbanking</Text>
                        <Text style={styles.methodSub}>Pay securely via Razorpay</Text>
                    </View>
                    {paymentMethod === 'razorpay' && (
                        <Ionicons name="checkmark-circle" size={scale(20)} color={COLORS.success} />
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.methodItem, paymentMethod === 'wallet' && styles.methodItemActive]}
                    onPress={() => showToast('Wallet balance is currently insufficient.', 'info')}
                >
                    <View style={styles.methodIcon}>
                        <MaterialCommunityIcons name="wallet-outline" size={scale(20)} color={COLORS.grey} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.methodName}>CircleUp Wallet</Text>
                        <Text style={styles.methodSub}>Pay using Karma points or balance</Text>
                    </View>
                    <View style={styles.limitedBadge}>
                        <Text style={styles.limitedText}>LIMITED</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark" size={scale(16)} color={COLORS.success} />
                <Text style={styles.infoText}>Your payment is safe with CircleUp Trust Guarantee. Deposit is refunded instantly on tool return.</Text>
            </View>
        </View>
      </ScrollView>

      {/* FOOTER ACTION */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.l }]}>
        <View style={styles.footerInfo}>
            <Text style={styles.footerPrice}>₹{totalAmount}</Text>
            <Text style={styles.footerLabel}>Final Payable</Text>
        </View>
        <TouchableOpacity 
            style={[styles.payButton, submitting && { opacity: 0.7 }]} 
            onPress={handlePlaceOrder}
            disabled={submitting}
        >
            {submitting ? (
                <ActivityIndicator color="white" />
            ) : (
                <>
                    <Text style={styles.payButtonText}>BOOK & PAY</Text>
                    <Ionicons name="arrow-forward" size={scale(20)} color="white" style={{ marginLeft: 8 }} />
                </>
            )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: scale(40), height: scale(40), justifyContent: 'center' },
  headerTitleBox: { flex: 1 },
  headerTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  headerSub: { fontSize: normalize(10), fontWeight: '800', color: COLORS.grey, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  progressContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 60, height: verticalScale(40), marginTop: 10 },
  progressLine: { flex: 1, height: 3 },
  progressDot: { width: 12, height: 12, borderRadius: 6 },

  orderCard: {
    backgroundColor: COLORS.white,
    margin: SPACING.l,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  itemImage: { width: scale(60), height: scale(60), borderRadius: BORDER_RADIUS.m, backgroundColor: '#F0F0F0' },
  itemInfo: { flex: 1, marginLeft: 12, flexShrink: 1 },
  itemCategory: { fontSize: normalize(9), fontWeight: '900', color: COLORS.grey, letterSpacing: 1 },
  itemName: { fontSize: normalize(16), fontWeight: '800', color: COLORS.primary, marginVertical: 2, flexShrink: 1 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: normalize(11), fontWeight: '700', color: COLORS.grey },
  daysBadge: { 
    padding: 10, 
    backgroundColor: '#FDEEDC', 
    borderRadius: 12, 
    alignItems: 'center',
    minWidth: scale(50)
  },
  daysVal: { fontSize: normalize(18), fontWeight: '900', color: COLORS.accent },
  daysLabel: { fontSize: normalize(8), fontWeight: '800', color: COLORS.accent },

  section: { paddingHorizontal: SPACING.l, marginBottom: verticalScale(24) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: normalize(11), fontWeight: '900', color: COLORS.divider, letterSpacing: 1.5 },
  changeText: { fontSize: normalize(12), fontWeight: '900', color: COLORS.accent },
  
  addressBox: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  addressIcon: { 
    width: scale(40), 
    height: scale(40), 
    backgroundColor: '#F0F3F7', 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  addressName: { fontSize: normalize(15), fontWeight: '800', color: COLORS.primary },
  addressDetails: { fontSize: normalize(12), fontWeight: '600', color: COLORS.grey, marginTop: 2 },
  addAddressPrompt: { fontSize: normalize(14), fontWeight: '700', color: COLORS.grey },

  billCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.m,
    ...SHADOWS.soft,
  },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  billLabel: { fontSize: normalize(13), fontWeight: '600', color: COLORS.grey },
  billVal: { fontSize: normalize(13), fontWeight: '700', color: COLORS.primary },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 8 },
  totalLabel: { fontSize: normalize(16), fontWeight: '900', color: COLORS.primary },
  totalVal: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },

  infoBox: { 
    flexDirection: 'row', 
    backgroundColor: '#E7F9EE', 
    padding: 12, 
    borderRadius: BORDER_RADIUS.m, 
    marginTop: 16,
    gap: 8,
    alignItems: 'center'
  },
  infoText: { fontSize: normalize(10), fontWeight: '700', color: '#1B5E20', flex: 1, lineHeight: 14 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.m,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    ...SHADOWS.medium,
    height: verticalScale(90),
  },
  footerInfo: { flex: 1 },
  footerPrice: { fontSize: normalize(20), fontWeight: '900', color: COLORS.primary },
  footerLabel: { fontSize: normalize(11), fontWeight: '800', color: COLORS.grey },
  paymentMethods: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  methodItemActive: {
    backgroundColor: '#F0F7FF',
  },
  methodIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodName: {
    fontSize: normalize(14),
    fontWeight: '800',
    color: COLORS.grey,
  },
  methodSub: {
    fontSize: normalize(11),
    fontWeight: '600',
    color: COLORS.grey,
    marginTop: 2,
  },
  limitedBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  limitedText: {
    fontSize: normalize(9),
    fontWeight: '900',
    color: '#999',
  },
  payButton: {
    backgroundColor: COLORS.primary,
    flex: 1.5,
    height: verticalScale(54),
    borderRadius: BORDER_RADIUS.m,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  payButtonText: { color: 'white', fontSize: normalize(15), fontWeight: '900', letterSpacing: 1 },
});
