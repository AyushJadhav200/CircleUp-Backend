import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, useWindowDimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveScreen } from '../../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../../constants/theme';
import { useCart } from '../../components/common/CartProvider';

const CATEGORY_GRID = [
  { name: 'All Tools', id: 'All', icon: 'toolbox-outline', color: COLORS.lightGrey },
  { name: 'Power Tools', id: 'Power Tools', icon: 'lightning-bolt', color: '#E6F0F9' },
  { name: 'Hand Tools', id: 'Hand Tools', icon: 'hammer-screwdriver', color: '#FFF3E0' },
  { name: 'Gardening', id: 'Gardening', icon: 'leaf', color: '#E8F5E9' },
  { name: 'Cleaning', id: 'Cleaning', icon: 'spray-bottle', color: '#FCE4EC' },
  { name: 'Automotive', id: 'Automotive', icon: 'car-wrench', color: '#ECEFF1' },
  { name: 'Painting', id: 'Painting', icon: 'format-paint', color: '#FFF9C4' },
  { name: 'Electronics', id: 'Electronics', icon: 'laptop', color: '#E1BEE7' },
];

const PROMO_BANNERS = [
  { id: '1', title: 'Join CircleUp\nas a Partner', sub: 'Share idle gear & accelerate profits', bg: COLORS.lightGrey, btn: 'Get Details', img: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?q=80&w=400' },
  { id: '2', title: 'Community\nProtection', sub: 'Verified users & safe lending', bg: '#FFF0D4', btn: 'Learn More', img: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=400' },
  { id: '3', title: 'Save Money,\nRent Nearby', sub: 'Instant access to premium tools', bg: '#E4EBFA', btn: 'Explore', img: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=400' },
  { id: '4', title: 'Karma\nRewards', sub: 'Earn points on every share', bg: '#E8F5E9', btn: 'Rank Up', img: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?q=80&w=400' },
];

export default function VaultScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const { totalItems } = useCart();

  // Auto-scroll banners every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      let nextIndex = (activeBanner + 1) % PROMO_BANNERS.length;
      setActiveBanner(nextIndex);
      bannerRef.current?.scrollToOffset({
        offset: nextIndex * (width - SPACING.l * 2),
        animated: true,
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [activeBanner, width]);

  return (
    <AdaptiveScreen style={styles.mainContainer} horizontalPadding={0} scrollable={true} backgroundColor="#F8F9FA">
      <StatusBar style="dark" />
      
      <View style={styles.headerContent}>
        {/* Top Title and Dropdown Menu */}
        <View style={styles.titleRow}>
          <TouchableOpacity 
            style={styles.menuBtn}
            onPress={() => setIsMenuOpen(!isMenuOpen)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIconContainer, isMenuOpen && styles.menuIconContainerActive]}>
              <Ionicons name={isMenuOpen ? "close" : "ellipsis-vertical"} size={scale(20)} color={isMenuOpen ? COLORS.white : COLORS.primary} />
            </View>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>The Vault</Text>

          <TouchableOpacity 
            style={styles.cartBtn}
            onPress={() => router.push('/cart' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="cart-outline" size={scale(24)} color={COLORS.primary} />
            {totalItems > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isMenuOpen && (
          <Animated.View entering={FadeInDown} style={styles.dropdown}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setIsMenuOpen(false);
                router.push('/lend-tool' as any);
              }}
            >
              <Ionicons name="add-circle-outline" size={scale(20)} color={COLORS.primary} />
              <Text style={styles.dropdownText}>List a Tool</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => {
                setIsMenuOpen(false);
                router.push('/buy-tools' as any);
              }}
            >
              <Ionicons name="cart-outline" size={scale(20)} color={COLORS.primary} />
              <Text style={styles.dropdownText}>Buy Tools</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => setIsMenuOpen(false)}
            >
              <Ionicons name="information-circle-outline" size={scale(20)} color={COLORS.grey} />
              <Text style={[styles.dropdownText, { color: COLORS.grey }]}>How it works</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Search Bar - Navigates to dedicated results page */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={scale(20)} color={COLORS.grey} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search for tools in your community"
            placeholderTextColor={COLORS.grey}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => {
              if (searchQuery.trim()) {
                router.push(`/category/search_${searchQuery.trim()}` as any);
              }
            }}
          />
        </View>

        {/* Promo Banner Carousel */}
        <View style={styles.bannerContainer}>
          <FlatList
            ref={bannerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={PROMO_BANNERS}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / (width - SPACING.l * 2));
              if (index !== activeBanner) setActiveBanner(index);
            }}
            renderItem={({ item }) => (
              <View style={[styles.bannerCard, { width: width - SPACING.l * 2, backgroundColor: item.bg }]}>
                <View style={styles.bannerTextContainer}>
                    <Text style={styles.bannerTitle}>{item.title}</Text>
                    <Text style={styles.bannerSub}>{item.sub}</Text>
                    <TouchableOpacity style={styles.bannerBtn}>
                      <Text style={styles.bannerBtnText}>{item.btn}</Text>
                    </TouchableOpacity>
                </View>
                <Image source={{ uri: item.img }} style={styles.bannerImg} cachePolicy="disk" transition={300} />
              </View>
            )}
            keyExtractor={(item) => item.id}
          />
          <View style={styles.dotContainer}>
            {PROMO_BANNERS.map((_, i) => (
              <View key={i} style={[styles.dot, activeBanner === i && styles.activeDot]} />
            ))}
          </View>
        </View>

        {/* Quick Stats / Latest Quote Analogue */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteLeft}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1542496658-e3268940d540?q=80&w=200' }} style={styles.quoteImg} cachePolicy="disk" transition={200} />
              <View>
                <Text style={styles.quoteSub}>Your Karma Ranking</Text>
                <Text style={styles.quoteTitle}>Top 5% Lender</Text>
                <Text style={styles.quoteEarn}>150 PTS</Text>
              </View>
          </View>
          <TouchableOpacity style={styles.quoteBtn} onPress={() => router.push('/lend-tool' as any)}>
              <Text style={styles.quoteBtnText}>Earn More</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.titleRow, { marginBottom: SPACING.m }]}>
          <Text style={styles.sectionHeaderTitle}>Rent For Cash</Text>
        </View>

        {/* 4x2 Category Grid - Navigates to dedicated page */}
        <View style={styles.gridContainer}>
          {CATEGORY_GRID.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.gridItem}
              onPress={() => router.push(`/category/${item.id}` as any)}
            >
              <View style={[styles.gridIconBox, { backgroundColor: item.color }]}>
                <MaterialCommunityIcons name={item.icon as any} size={scale(24)} color={COLORS.primary} />
              </View>
              <Text style={styles.gridText} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.footerSpace} />
      </View>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  headerContent: { paddingHorizontal: SPACING.l, paddingTop: verticalScale(10), marginBottom: verticalScale(10) },
  headerTitle: { fontSize: normalize(22), fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5, flex: 1, textAlign: 'center' },
  
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.m },
  menuBtn: { paddingVertical: 5 },
  menuIconContainer: {
    width: scale(44),
    height: scale(44),
    borderRadius: BORDER_RADIUS.m,
    backgroundColor: COLORS.lightGrey,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...SHADOWS.soft,
  },
  menuIconContainerActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  
  dropdown: {
    position: 'absolute',
    top: verticalScale(60),
    left: 0,
    width: scale(180),
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.s,
    zIndex: 1000,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.m, gap: 12 },
  dropdownText: { fontSize: normalize(14), fontWeight: '700', color: COLORS.primary },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: SPACING.s },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    height: verticalScale(54),
    marginBottom: verticalScale(20),
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.soft,
  },
  searchInput: { flex: 1, marginLeft: SPACING.s, fontSize: normalize(15), color: COLORS.primary, fontWeight: '600' },

  bannerContainer: { marginBottom: verticalScale(20) },
  bannerCard: {
     height: verticalScale(180),
     borderRadius: BORDER_RADIUS.l,
     flexDirection: 'row',
     overflow: 'hidden',
  },
  bannerTextContainer: { flex: 1, padding: SPACING.l, justifyContent: 'center' },
  bannerTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  bannerSub: { fontSize: normalize(12), fontWeight: '600', color: '#555', marginTop: 4, marginBottom: 12 },
  bannerBtn: { backgroundColor: COLORS.accent, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.s },
  bannerBtnText: { fontSize: normalize(12), fontWeight: '800', color: COLORS.primary },
  bannerImg: { width: '40%', height: '100%' },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.divider, marginHorizontal: 4 },
  activeDot: { backgroundColor: COLORS.primary, width: 20 },

  quoteCard: {
     flexDirection: 'row',
     backgroundColor: COLORS.white,
     borderRadius: BORDER_RADIUS.m,
     padding: SPACING.m,
     alignItems: 'center',
     justifyContent: 'space-between',
     marginBottom: verticalScale(20),
     borderWidth: 1,
     borderColor: COLORS.divider,
     ...SHADOWS.soft,
  },
  quoteLeft: { flexDirection: 'row', alignItems: 'center' },
  quoteImg: { width: scale(40), height: scale(40), borderRadius: scale(20), marginRight: SPACING.m },
  quoteSub: { fontSize: normalize(10), color: COLORS.accent, fontWeight: '800' },
  quoteTitle: { fontSize: normalize(14), color: COLORS.primary, fontWeight: '800' },
  quoteEarn: { fontSize: normalize(16), fontWeight: '900', color: COLORS.primary },
  quoteBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.m },
  quoteBtnText: { color: COLORS.white, fontWeight: '800', fontSize: normalize(12) },

  sectionHeaderTitle: { fontSize: normalize(22), fontWeight: '900', color: COLORS.primary, letterSpacing: -0.5 },
  
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: '2%' },
  gridItem: { width: '23%', alignItems: 'center', marginBottom: SPACING.l },
  gridIconBox: { 
     width: scale(56), 
     height: scale(56), 
     borderRadius: scale(16), 
     justifyContent: 'center', 
     alignItems: 'center',
     marginBottom: 6,
  },
  gridText: { fontSize: normalize(11), fontWeight: '700', color: COLORS.grey, textAlign: 'center' },
  footerSpace: { height: verticalScale(100) },
  cartBtn: {
    width: scale(44),
    height: scale(44),
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.m,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...SHADOWS.soft,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.accent,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: normalize(9),
    fontWeight: '900',
  },
});
