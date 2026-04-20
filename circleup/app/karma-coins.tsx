import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withRepeat, 
  withSequence,
  withDelay
} from 'react-native-reanimated';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';

export default function KarmaCoinsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  
  // Animation values
  const giftScale = useSharedValue(0);
  const giftRotate = useSharedValue(0);
  const coinY = useSharedValue(0);

  useEffect(() => {
    // Gift pop-in
    giftScale.value = withDelay(500, withSpring(1));
    
    // Gentle floating for coins
    coinY.value = withRepeat(
      withSequence(
        withSpring(-10, { damping: 2 }),
        withSpring(0, { damping: 2 })
      ),
      -1,
      true
    );
  }, []);

  const animatedGiftStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: giftScale.value },
      { rotate: `${giftRotate.value}deg` }
    ]
  }));

  const animatedCoinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: coinY.value }]
  }));

  return (
    <AdaptiveScreen 
      style={styles.mainContainer} 
      horizontalPadding={0} 
      scrollable={true} 
      backgroundColor="#0F172A"
      useSafeArea={true}
    >
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Karma Rewards</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <View style={styles.content}>
        {/* Celebration Illustration */}
        <Animated.View style={[styles.illustrationContainer, animatedGiftStyle]}>
          <Image 
            source={require('../assets/banners/karma_reward.webp')} 
            style={styles.illustration}
            contentFit="contain"
            priority="high"
          />
        </Animated.View>

        {/* Hero Section */}
        <Animated.View entering={FadeInUp.delay(800)} style={styles.heroSection}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="star-face" size={scale(20)} color="#FACC15" />
            <Text style={styles.badgeText}>COMMUNITY HERO</Text>
          </View>
          <Text style={styles.heroTitle}>Collect 2,000 Karma Coins</Text>
          <Text style={styles.heroSub}>Unlock the ultimate reward through community sharing!</Text>
        </Animated.View>

        {/* Reward Card */}
        <Animated.View entering={FadeInDown.delay(1000)} style={styles.rewardCard}>
          <View style={styles.cardHeader}>
             <Animated.View style={[animatedCoinStyle, styles.iconContainer]}>
               <MaterialCommunityIcons name="gift-outline" size={scale(44)} color="#FACC15" />
             </Animated.View>
             <View style={styles.titleContainer}>
               <Text style={styles.rewardTitle}>Get ANY Product for FREE</Text>
             </View>
          </View>
          <Text style={styles.rewardDesc}>
            Once you cross the <Text style={styles.highlight}>2,000 Karma Coin</Text> milestone, the CircleUp Team will gift you any product of your choice from the platform!
          </Text>
          <View style={styles.divider} />
          <View style={styles.howItWorks}>
             <View style={styles.step}>
                <Ionicons name="checkmark-circle" size={scale(20)} color="#FACC15" />
                <Text style={styles.stepText}>List high-quality items</Text>
             </View>
             <View style={styles.step}>
                <Ionicons name="checkmark-circle" size={scale(20)} color="#FACC15" />
                <Text style={styles.stepText}>Help your neighbors</Text>
             </View>
             <View style={styles.step}>
                <Ionicons name="gift" size={scale(20)} color="#FACC15" />
                <Text style={styles.stepText}>Claim your reward!</Text>
             </View>
          </View>
        </Animated.View>

        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => router.push('/lend-tool' as any)}
        >
          <Text style={styles.primaryBtnText}>Start Earning Now</Text>
          <Ionicons name="rocket" size={scale(20)} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.footer}>
           <Text style={styles.footerText}>Total Karma Coins are calculated based on your contribution to the circular economy.</Text>
        </View>
      </View>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  mainContainer: { },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(15),
  },
  backBtn: { padding: scale(5) },
  headerTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.white },
  
  content: { paddingHorizontal: SPACING.xl, alignItems: 'center' },
  
  illustrationContainer: {
    width: '100%',
    height: verticalScale(260),
    marginTop: verticalScale(10),
    marginBottom: verticalScale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: { width: '100%', height: '100%' },
  
  heroSection: { alignItems: 'center', marginBottom: verticalScale(30) },
  badge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(250, 204, 21, 0.1)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.3)',
  },
  badgeText: { fontSize: normalize(10), color: '#FACC15', fontWeight: '900', marginLeft: 6 },
  heroTitle: { fontSize: normalize(24), fontWeight: '900', color: COLORS.white, textAlign: 'center' },
  heroSub: { fontSize: normalize(14), color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8 },
  
  rewardCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.xl,
    borderWidth: 2,
    borderColor: '#FACC15',
    ...SHADOWS.medium,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconContainer: {
    width: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  rewardTitle: { fontSize: normalize(18), fontWeight: '900', color: '#FACC15' },
  rewardDesc: { fontSize: normalize(14), color: COLORS.white, lineHeight: 22 },
  highlight: { color: COLORS.accent, fontWeight: '900' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 20 },
  
  howItWorks: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center' },
  stepText: { fontSize: normalize(13), color: 'rgba(255,255,255,0.9)', marginLeft: 10, fontWeight: '600' },
  
  primaryBtn: {
    width: '100%',
    height: verticalScale(56),
    backgroundColor: '#FACC15',
    borderRadius: BORDER_RADIUS.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(30),
    ...SHADOWS.medium,
  },
  primaryBtnText: { fontSize: normalize(16), fontWeight: '900', color: '#0F172A', marginRight: 10 },
  
  footer: { marginTop: 25, marginBottom: 80 },
  footerText: { fontSize: normalize(11), color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18 },
});
