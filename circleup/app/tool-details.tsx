import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions, Alert, Platform, FlatList, NativeSyntheticEvent, NativeScrollEvent, Share } from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { api } from '../services/api';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useToast } from '../components/common/ToastProvider';
import { Shimmer } from '../components/common/Shimmer';
import * as Sharing from 'expo-sharing';

export default function ToolDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { showToast } = useToast();
  const { width, height } = useWindowDimensions();
  const [tool, setTool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000));
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  // calculate days and price
  const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalPrice = tool ? tool.price_per_day * days : 0;

  // Responsive hero height based on device aspect ratio
  const heroHeight = height > 800 ? verticalScale(350) : verticalScale(300);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [toolRes, userRes, wishlistRes] = await Promise.all([
          api.get(`/tools/${id}`),
          api.post('/auth/me'),
          api.get('/tools/wishlist')
        ]);
        if (toolRes.data) setTool(toolRes.data);
        if (userRes.data) setCurrentUser(userRes.data);
        if (wishlistRes.data) {
          const liked = wishlistRes.data.some((item: any) => item.tool_id === parseInt(id as string));
          setIsLiked(liked);
        }
      } catch (e) {
        console.error('Failed to fetch data', e);
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };
    fetchData();
  }, [id]);

  const handleDelete = () => {
    Alert.alert(
      "Delete Listing",
      "Are you sure you want to remove this tool from the community? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await api.delete(`/tools/${id}`);
              showToast('Listing removed successfully', 'success');
              router.replace('/(tabs)/vault' as any);
            } catch (e: any) {
              showToast(e.response?.data?.detail || 'Failed to delete listing', 'error');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const ToolSkeleton = () => (
    <View style={styles.container}>
      <Shimmer width="100%" height={heroHeight} />
      <View style={[styles.contentBody, { marginTop: -verticalScale(30) }]}>
        <Shimmer width="30%" height={24} borderRadius={8} style={{ marginBottom: 12 }} />
        <Shimmer width="80%" height={40} borderRadius={8} style={{ marginBottom: 16 }} />
        <Shimmer width="40%" height={20} borderRadius={4} style={{ marginBottom: 32 }} />
        <Shimmer width="100%" height={80} borderRadius={20} />
      </View>
    </View>
  );

  if (loading) return <ToolSkeleton />;
  if (!tool) return (
    <View style={styles.container}>
      <Text style={{ textAlign: 'center', marginTop: 100 }}>Tool not found</Text>
    </View>
  );

  const isOwner = currentUser && tool && currentUser.id === tool.owner_id;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* STICKY HEADER */}
      <View style={[styles.headerNav, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{tool.name}</Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity 
            style={styles.headerBtn}
            onPress={async () => {
              const shareUrl = `https://circleup-backend-1.onrender.com/join?product_id=${id}&code=${currentUser?.referral_code || ''}`;
              const message = `Check out this ${tool.name} on CircleUp! Use my link to get a bonus on your first rental: ${shareUrl}`;
              try {
                await Share.share({
                  message: message,
                  url: shareUrl,
                  title: 'Share tool'
                });
              } catch (error: any) {
                Alert.alert('Error', error.message);
              }
            }}
          >
            <Ionicons name="share-outline" size={scale(22)} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerBtn}
            onPress={async () => {
              try {
                const res = await api.post('/tools/wishlist/toggle', { tool_id: parseInt(id as string) });
                setIsLiked(res.data.status === 'added');
                showToast(res.data.status === 'added' ? 'Added to wishlist' : 'Removed from wishlist', 'success');
              } catch (err) {
                showToast('Action failed', 'error');
              }
            }}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={scale(22)} 
              color={isLiked ? COLORS.error : COLORS.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: verticalScale(140) }}>
        
        {/* CENTERED CAROUSEL */}
        <View style={[styles.carouselContainer, { height: heroHeight }]}>
            <FlatList
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                data={tool.images && tool.images.length > 0 ? tool.images : [tool.image_url]}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                const x = e.nativeEvent.contentOffset.x;
                setActiveImage(Math.round(x / width));
                }}
                renderItem={({ item }: { item: string }) => (
                <View style={{ width, justifyContent: 'center', alignItems: 'center', padding: SPACING.m }}>
                    <Image 
                        source={{ uri: item || 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800' }} 
                        style={styles.carouselImage}
                        contentFit="contain"
                        cachePolicy="disk"
                        transition={250}
                        placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                    />
                </View>
                )}
                keyExtractor={(_: any, index: number) => index.toString()}
            />
            
            {/* PAGINATION DOTS */}
            <View style={styles.dotContainer}>
                {(tool.images && tool.images.length > 1 ? tool.images : [tool.image_url]).map((_: any, index: number) => (
                <View 
                    key={index} 
                    style={[styles.dot, activeImage === index && styles.activeDot]} 
                />
                ))}
            </View>
        </View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.contentBody}>
            <View style={styles.headerSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.badgeRow}>
                            <View style={styles.categoryBadge}>
                                <Text style={styles.categoryText}>{tool.category?.toUpperCase()}</Text>
                            </View>
                        </View>
                        <Text style={styles.toolTitle}>{tool.name}</Text>
                        <Text style={styles.locationText}>📍 Nearby • Community Hub</Text>
                    </View>
                    
                    {/* FLOATING RATING BOX */}
                    <View style={styles.ratingBox}>
                        <View style={styles.ratingPill}>
                            <Text style={styles.ratingVal}>{tool.rating || '4.9'}</Text>
                            <Ionicons name="star" size={normalize(14)} color="white" />
                        </View>
                        <Text style={styles.reviewsText}>{tool.reviews || 12} reviews</Text>
                    </View>
                </View>
            </View>

            <View style={styles.ownerCard}>
                <Image 
                    source={{ uri: `https://api.dicebear.com/7.x/lorelei/svg?seed=${tool.owner_name}` }} 
                    style={styles.ownerAvatar} 
                />
                <View style={styles.ownerInfo}>
                    <Text style={styles.ownerName}>{tool.owner_name}</Text>
                    {tool.owner_is_verified ? (
                      <View style={styles.trustBadgeSmall}>
                          <Ionicons name="shield-checkmark" size={normalize(12)} color={COLORS.success} />
                          <Text style={styles.verifiedText}>Verified Neighbor</Text>
                      </View>
                    ) : (
                      <Text style={styles.unverifiedText}>Community Member</Text>
                    )}
                </View>
                {!isOwner && (
                  <TouchableOpacity 
                      style={[styles.msgBtn, loading && { opacity: 0.5 }]} 
                      onPress={async () => {
                          if (!tool.owner_id || loading) return;
                          setLoading(true);
                          try {
                              const res = await api.post(`/chats/start/${tool.owner_id}`);
                              const chat = res.data;
                              router.push({
                                  pathname: '/chat/[id]',
                                  params: { id: chat.id, name: chat.other_user_name }
                              } as any);
                          } catch (e) {
                              showToast('Could not start conversation', 'error');
                          } finally {
                              setLoading(false);
                          }
                      }}
                      disabled={loading}
                  >
                      <Ionicons name="chatbubble-ellipses-outline" size={scale(22)} color={COLORS.primary} />
                  </TouchableOpacity>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>WHY RENT FROM {tool.owner_name?.toUpperCase() || 'NEIGHBOR'}</Text>
                <View style={styles.guaranteeGrid}>
                    <View style={styles.guaranteeItem}>
                        <MaterialCommunityIcons name="clock-check-outline" size={scale(20)} color={COLORS.primary} />
                        <Text style={styles.guaranteeText}>Quick Reply</Text>
                    </View>
                    <View style={styles.guaranteeItem}>
                        <MaterialCommunityIcons name="tools" size={scale(20)} color={COLORS.primary} />
                        <Text style={styles.guaranteeText}>Well Maintained</Text>
                    </View>
                    <View style={styles.guaranteeItem}>
                        <MaterialCommunityIcons name="handshake-outline" size={scale(20)} color={COLORS.primary} />
                        <Text style={styles.guaranteeText}>Safe Handover</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>ABOUT THIS ITEM</Text>
                <Text style={styles.description}>{tool.description}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>SMART SCHEDULER</Text>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.dateStrip}
                >
                    {Array.from({ length: 14 }).map((_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() + i);
                        const isSelected = date.toDateString() === startDate.toDateString() || date.toDateString() === endDate.toDateString();
                        const isInRange = date > startDate && date < endDate;
                        
                        return (
                            <TouchableOpacity 
                                key={i} 
                                style={[
                                    styles.datePill, 
                                    isSelected && styles.datePillActive,
                                    isInRange && styles.datePillRange
                                ]}
                                onPress={() => {
                                    if (date.toDateString() === startDate.toDateString()) return;
                                    if (date < startDate) setStartDate(date);
                                    else setEndDate(date);
                                }}
                            >
                                <Text style={[styles.datePillDay, isSelected && styles.datePillTextActive]}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                </Text>
                                <Text style={[styles.datePillNum, isSelected && styles.datePillTextActive]}>
                                    {date.getDate()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                
                <View style={styles.schedulerInfo}>
                    <Ionicons name="calendar-outline" size={scale(16)} color={COLORS.primary} />
                    <Text style={styles.schedulerInfoText}>
                        Selected: {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({days} days)
                    </Text>
                </View>
            </View>
                
                {showPicker && (
                  <DateTimePicker
                    value={showPicker === 'start' ? startDate : endDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={showPicker === 'end' ? startDate : new Date()}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') setShowPicker(null);
                      if (selectedDate) {
                        if (showPicker === 'start') setStartDate(selectedDate);
                        else setEndDate(selectedDate);
                      }
                    }}
                  />
                )}
                {Platform.OS === 'ios' && showPicker && (
                    <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 10 }} onPress={() => setShowPicker(null)}>
                        <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Done</Text>
                    </TouchableOpacity>
                )}

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>TERMS OF RENTAL</Text>
                <View style={styles.termRow}>
                    <Ionicons name="checkmark-circle-outline" size={scale(18)} color={COLORS.success} />
                    <Text style={styles.termText}>Clean and dry after use</Text>
                </View>
                <View style={styles.termRow}>
                    <Ionicons name="checkmark-circle-outline" size={scale(18)} color={COLORS.success} />
                    <Text style={styles.termText}>Notify owner 1h before return</Text>
                </View>
            </View>
        </Animated.View>
      </ScrollView>

      {/* STICKY FOOTER (Safe Area Aware) */}
      <View style={[styles.stickyFooter, { height: verticalScale(100) + insets.bottom, paddingBottom: insets.bottom }]}>
          <View style={{ flexDirection: 'column', justifyContent: 'center' }}>
              <View style={styles.priceContainer}>
                  <Text style={styles.priceValue}>₹{totalPrice || tool.price_per_day}</Text>
                  <Text style={styles.priceTerm}>/ {days} DAYS</Text>
              </View>
              {tool.sale_price > 0 && (
                <View style={[styles.priceContainer, { marginTop: 4 }]}>
                  <Text style={[styles.priceValue, { fontSize: normalize(20) }]}>₹{tool.sale_price}</Text>
                  <Text style={styles.priceTerm}>/ BUY</Text>
                </View>
              )}
          </View>
          
          {isOwner ? (
            <TouchableOpacity 
              style={[styles.rentButton, { backgroundColor: '#FF3B30' }]}
              onPress={handleDelete}
              disabled={deleting}
            >
                <Text style={styles.rentButtonText}>
                    {deleting ? 'DELETING...' : 'DELETE LISTING'}
                </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row', marginLeft: SPACING.l, gap: 8 }}>
                {tool.sale_price > 0 && (
                  <TouchableOpacity 
                    style={[styles.rentButton, { flex: 1, marginLeft: 0, backgroundColor: COLORS.grey }]}
                    onPress={() => showToast('Purchase request sent to owner!', 'success')}
                  >
                      <Text style={[styles.rentButtonText, { fontSize: normalize(14) }]}>BUY</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.rentButton, !tool.is_available && { backgroundColor: COLORS.grey }, { flex: tool.sale_price > 0 ? 1 : 1, marginLeft: 0 }]}
                  disabled={!tool.is_available || loading}
                  onPress={() => {
                    router.push({
                      pathname: '/checkout',
                      params: { 
                        id: tool.id,
                        startDate: startDate.toISOString(),
                        endDate: endDate.toISOString()
                      }
                    } as any);
                  }}
                >
                    <Text style={[styles.rentButtonText, tool.sale_price > 0 && { fontSize: normalize(14) }]}>
                        {tool.is_available ? 'REQUEST BOOKING' : 'OUT'}
                    </Text>
                </TouchableOpacity>
            </View>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  headerNav: {
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: normalize(16),
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  carouselContainer: { width: '100%', backgroundColor: '#F9FAFB', position: 'relative' },
  carouselImage: { width: '100%', height: '100%', borderRadius: BORDER_RADIUS.l },
  dotContainer: { 
    position: 'absolute', 
    bottom: 20, 
    flexDirection: 'row', 
    width: '100%', 
    justifyContent: 'center', 
    gap: 6 
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D1D6' },
  activeDot: { backgroundColor: COLORS.primary, width: 14 },
  contentBody: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(20),
  },
  headerSection: { marginBottom: verticalScale(30) },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  categoryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F0F3F7' },
  categoryText: { fontSize: normalize(10), fontWeight: '900', color: COLORS.grey, letterSpacing: 1 },
  ratingBox: { alignItems: 'center' },
  ratingPill: { 
    backgroundColor: COLORS.success, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 8,
    gap: 4
  },
  ratingVal: { color: 'white', fontWeight: '900', fontSize: normalize(14) },
  reviewsText: { fontSize: normalize(10), fontWeight: '700', color: COLORS.grey, marginTop: 4 },
  toolTitle: { fontSize: normalize(26), fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5, marginBottom: 4 },
  locationText: { fontSize: normalize(14), fontWeight: '600', color: COLORS.grey },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.m,
    backgroundColor: '#F8F9FB',
    borderRadius: BORDER_RADIUS.l,
    marginBottom: verticalScale(32),
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  ownerAvatar: { width: scale(48), height: scale(48), borderRadius: scale(12), backgroundColor: COLORS.white },
  ownerInfo: { flex: 1, marginLeft: 12 },
  ownerName: { fontSize: normalize(16), fontWeight: '800', color: COLORS.primary },
  verifiedText: { fontSize: normalize(11), fontWeight: '700', color: COLORS.success, marginLeft: 4 },
  unverifiedText: { fontSize: normalize(11), fontWeight: '600', color: COLORS.grey, marginTop: 2 },
  trustBadgeSmall: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  msgBtn: { width: scale(44), height: scale(44), borderRadius: 22, backgroundColor: '#F0F3F7', justifyContent: 'center', alignItems: 'center', ...SHADOWS.soft, borderWidth: 1, borderColor: '#F0F0F0' },
  section: { marginBottom: verticalScale(32) },
  sectionTitle: { fontSize: normalize(11), fontWeight: '900', color: COLORS.divider, letterSpacing: 2, marginBottom: 16 },
  description: { fontSize: normalize(15), lineHeight: 24, color: '#444', fontWeight: '500' },
  guaranteeGrid: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginTop: 8,
      backgroundColor: '#F9FAFB',
      padding: 16,
      borderRadius: BORDER_RADIUS.m,
      borderWidth: 1,
      borderColor: '#F0F0F0'
  },
  guaranteeItem: { flex: 1, alignItems: 'center', gap: 6 },
  guaranteeText: { fontSize: normalize(10), fontWeight: '800', color: COLORS.primary, textAlign: 'center' },
  termRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, backgroundColor: '#F8F9FA', padding: 12, borderRadius: BORDER_RADIUS.m },
  termText: { fontSize: normalize(14), fontWeight: '600', color: COLORS.primary, marginLeft: 10 },
  stickyFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.white,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.l,
      borderTopWidth: 1,
      borderTopColor: '#F0F0F0',
      ...SHADOWS.medium,
      height: verticalScale(80),
  },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  priceValue: { fontSize: normalize(28), fontWeight: '900', color: COLORS.primary },
  priceTerm: { fontSize: normalize(12), fontWeight: '800', color: COLORS.grey, marginLeft: 4 },
  rentButton: {
      flex: 1,
      marginLeft: SPACING.l,
      height: verticalScale(56),
      backgroundColor: COLORS.primary,
      borderRadius: BORDER_RADIUS.m,
      justifyContent: 'center',
      alignItems: 'center',
      ...SHADOWS.medium,
  },
  rentButtonText: { fontSize: normalize(16), fontWeight: '900', color: COLORS.white, letterSpacing: 1 },
  dateVal: { fontSize: normalize(14), fontWeight: '800', color: COLORS.primary },
  dateStrip: { paddingBottom: 10 },
  datePill: { 
    width: scale(64), 
    height: verticalScale(80), 
    backgroundColor: '#F9FAFB', 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0'
  },
  datePillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  datePillRange: { backgroundColor: 'rgba(0, 26, 51, 0.05)', borderColor: COLORS.primary, borderStyle: 'dashed' },
  datePillDay: { fontSize: normalize(10), fontWeight: '900', color: COLORS.grey, marginBottom: 4 },
  datePillNum: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  datePillTextActive: { color: COLORS.white },
  schedulerInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12 },
  schedulerInfoText: { fontSize: normalize(12), fontWeight: '700', color: COLORS.primary, marginLeft: 8 },
});
