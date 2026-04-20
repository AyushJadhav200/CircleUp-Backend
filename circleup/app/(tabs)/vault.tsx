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
import * as SecureStore from 'expo-secure-store';

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
  { id: '1', title: 'Welcome to\nCircleUp', sub: 'The smarter way to share & rent in your community. Join us today!', bg: '#E8EAF0', btn: 'Explore', img: require('../../assets/images/android-icon-foreground.png') },
  { id: '2', title: 'Why Buy for\nOne-Time Use?', sub: 'Instead of buying, do CircleUp. Rent nearby tools instantly and save.', bg: '#FFF0D4', btn: 'Rent Now', img: require('../../assets/banners/sharing.webp') },
  { id: '3', title: 'Earn From\nIdle Items', sub: 'List your items for rent if you don\'t need them daily. Turn gear into cash.', bg: '#E4EBFA', btn: 'Start Earning', img: require('../../assets/banners/earning.webp') },
  { id: '4', title: 'Wedding\nRentals', sub: 'Exquisite Wedding Cloths & Jwellery now on rent. Rent your dream outfit.', bg: '#E8F5E9', btn: 'Browse Collections', img: require('../../assets/banners/wedding.webp'), isSpecial: true },
];

import { api } from '../../services/api';

export default function VaultScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeBanner, setActiveBanner] = useState(0);
  const bannerRef = useRef<FlatList>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const clothesSectionRef = useRef<View>(null);
  const { totalItems } = useCart();
  
  // Fetch user profile and check for pending deep links on mount
  useEffect(() => {
    const initVault = async () => {
      try {
        await api.get('/auth/me');
        
        // Handle pending product deep link
        const pendingProductId = await SecureStore.getItemAsync('pending_product_id');
        if (pendingProductId) {
          console.log('[Vault] Navigating to pending product:', pendingProductId);
          await SecureStore.deleteItemAsync('pending_product_id');
          router.push(`/tool-details?id=${pendingProductId}` as any);
        }
      } catch (error: any) {
        console.error('Vault init error:', error);
        if (error.response?.status === 401) {
          router.replace('/');
        }
      }
    };
    initVault();
  }, [router]);

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
  
  const scrollToRentals = () => {
    clothesSectionRef.current?.measureLayout(
      // @ts-ignore
      mainScrollRef.current?.getInnerViewNode?.() || mainScrollRef.current,
      (x, y) => {
        mainScrollRef.current?.scrollTo({ y: y - 20, animated: true });
      },
      () => {}
    );
    // Fallback for simple scroll if measure fails
    mainScrollRef.current?.scrollTo({ y: verticalScale(600), animated: true });
  };

  return (
    <AdaptiveScreen ref={mainScrollRef as any} style={styles.mainContainer} horizontalPadding={0} scrollable={true} backgroundColor="#F8F9FA">
      <StatusBar style="dark" />
      
      {/* UNIQUE BACKGROUND DECOR */}
      <View style={styles.bgDecorContainer} pointerEvents="none">
         <View style={[styles.bgBlob, { top: -scale(50), right: -scale(50), backgroundColor: '#E3F2FD' }]} />
         <View style={[styles.bgBlob, { top: verticalScale(300), left: -scale(80), backgroundColor: '#FFF3E0', width: scale(200), height: scale(200) }]} />
         <View style={[styles.bgBlob, { top: verticalScale(600), right: -scale(40), backgroundColor: '#F3E5F5' }]} />
      </View>

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

          <View style={styles.headerTitleContainer}>
             <Text style={styles.headerTitleMain}>Circle</Text>
             <Text style={styles.headerTitleSub}>Up</Text>
          </View>

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
              <Text style={styles.dropdownText}>List an Item</Text>
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
              onPress={() => {
                setIsMenuOpen(false);
                router.push('/how-it-works' as any);
              }}
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
            placeholder="Search for items in your community"
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
                    <TouchableOpacity 
                      style={styles.bannerBtn} 
                      onPress={() => {
                        if (item.id === '1') {
                           router.push('/category/All' as any);
                        } else if (item.id === '2') {
                           router.push('/category/All' as any);
                        } else if (item.id === '3') {
                           router.push('/lend-tool' as any);
                        } else if (item.isSpecial) {
                           scrollToRentals();
                        }
                      }}
                    >
                      <Text style={styles.bannerBtnText}>{item.btn}</Text>
                    </TouchableOpacity>
                </View>
                {item.id === '1' ? (
                  <View style={{ width: '40%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Image source={item.img} style={{ width: scale(90), height: scale(90) }} contentFit="contain" cachePolicy="disk" transition={300} priority="high" />
                    <Text style={{ fontSize: normalize(18), fontWeight: '900', color: COLORS.primary, marginTop: -2 }}>
                      Circle<Text style={{ color: COLORS.accent }}>Up</Text>
                    </Text>
                  </View>
                ) : (
                  <Image source={item.img} style={styles.bannerImg} cachePolicy="disk" transition={300} priority="high" />
                )}
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

        {/* Karma Coins Banner */}
        <TouchableOpacity 
          style={styles.quoteCard} 
          onPress={() => router.push('/karma-coins' as any)}
          activeOpacity={0.8}
        >
          <View style={styles.quoteLeft}>
              <View style={[styles.quoteImgContainer, { backgroundColor: '#FFF9C4' }]}>
                <Ionicons name="sparkles" size={scale(24)} color="#FBC02D" />
              </View>
              <View>
                <Text style={styles.quoteSub}>Karma Rewards</Text>
                <Text style={styles.quoteTitle}>Know about karma Coins</Text>
                <Text style={styles.quoteEarn}>Earn while you share</Text>
              </View>
          </View>
          <View style={styles.quoteBtn}>
              <Text style={styles.quoteBtnText}>Explore</Text>
          </View>
        </TouchableOpacity>

        <View style={[styles.titleRow, { marginBottom: SPACING.l }]}>
          <View>
            <Text style={styles.sectionHeaderTitle}>TOOLS</Text>
            <View style={styles.headerAccent} />
          </View>
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

        {/* NEW SECTIONS: CLOTHS & JWELLERY */}
        <View ref={clothesSectionRef} style={[styles.titleRow, { marginTop: SPACING.l, marginBottom: SPACING.m }]}>
          <View>
            <Text style={styles.sectionHeaderTitle}>CLOTHS</Text>
            <View style={[styles.headerAccent, { backgroundColor: '#F06292' }]} />
          </View>
          <TouchableOpacity onPress={() => router.push('/category/type_Cloths' as any)}>
            <Text style={{ fontSize: normalize(12), color: COLORS.accent, fontWeight: '800' }}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
           style={styles.largeSectionBtn}
           onPress={() => router.push('/category/type_Cloths' as any)}
        >
           <View style={[styles.sectionIconBox, { backgroundColor: '#FCE4EC' }]}>
              <MaterialCommunityIcons name="tshirt-crew-outline" size={scale(32)} color={COLORS.primary} />
           </View>
           <View style={{ flex: 1, marginLeft: SPACING.m }}>
              <Text style={styles.sectionBtnTitle}>Rent Fashion Cloths</Text>
              <Text style={styles.sectionBtnSub}>Designer wear, jackets, and more</Text>
           </View>
           <Ionicons name="chevron-forward" size={scale(24)} color={COLORS.divider} />
        </TouchableOpacity>

        <View style={[styles.titleRow, { marginTop: SPACING.l, marginBottom: SPACING.m }]}>
          <View>
            <Text style={styles.sectionHeaderTitle}>JEWELLERY</Text>
            <View style={[styles.headerAccent, { backgroundColor: '#FFD54F' }]} />
          </View>
          <TouchableOpacity onPress={() => router.push('/category/type_Jwellery' as any)}>
            <Text style={{ fontSize: normalize(12), color: COLORS.accent, fontWeight: '800' }}>View All</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
           style={styles.largeSectionBtn}
           onPress={() => router.push('/category/type_Jwellery' as any)}
        >
           <View style={[styles.sectionIconBox, { backgroundColor: 'transparent' }]}>
              <Image source={require('../../assets/images/jewellery-icon.png')} style={{ width: '100%', height: '100%' }} contentFit="cover" />
           </View>
           <View style={{ flex: 1, marginLeft: SPACING.m }}>
              <Text style={styles.sectionBtnTitle}>Premium Jewellery</Text>
              <Text style={styles.sectionBtnSub}>Elegance shared within your community</Text>
           </View>
           <Ionicons name="chevron-forward" size={scale(24)} color={COLORS.divider} />
        </TouchableOpacity>
        
        <View style={styles.footerSpace} />
      </View>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  mainContainer: { backgroundColor: '#F8F9FA' },
  headerContent: { paddingHorizontal: SPACING.l, paddingTop: verticalScale(10), marginBottom: verticalScale(10) },
  headerTitleContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'baseline' 
  },
  headerTitleMain: { 
    fontSize: normalize(26), 
    fontWeight: '900', 
    color: COLORS.primary, 
    letterSpacing: -1.5 
  },
  headerTitleSub: { 
    fontSize: normalize(26), 
    fontWeight: '900', 
    color: COLORS.accent, 
    letterSpacing: -1.5,
    marginLeft: 1
  },
  
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
  quoteImgContainer: { 
    width: scale(40), 
    height: scale(40), 
    borderRadius: scale(20), 
    marginRight: SPACING.m,
    justifyContent: 'center',
    alignItems: 'center'
  },
  quoteSub: { fontSize: normalize(10), color: COLORS.accent, fontWeight: '800' },
  quoteTitle: { fontSize: normalize(14), color: COLORS.primary, fontWeight: '800' },
  quoteEarn: { fontSize: normalize(16), fontWeight: '900', color: COLORS.primary },
  quoteBtn: { backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BORDER_RADIUS.m },
  quoteBtnText: { color: COLORS.white, fontWeight: '800', fontSize: normalize(12) },

  sectionHeaderTitle: { 
    fontSize: normalize(20), 
    fontWeight: '900', 
    color: COLORS.primary, 
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerAccent: {
    width: '40%',
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginTop: 2,
  },
  bgDecorContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: 'hidden',
  },
  bgBlob: {
    position: 'absolute',
    width: scale(300),
    height: scale(300),
    borderRadius: scale(150),
    opacity: 0.15,
  },
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
  largeSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    borderWidth: 1,
    borderColor: COLORS.divider,
    ...SHADOWS.soft,
  },
  sectionIconBox: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  sectionBtnTitle: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: COLORS.primary,
  },
  sectionBtnSub: {
    fontSize: normalize(12),
    color: COLORS.grey,
    marginTop: 2,
  },
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
