import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown, FadeInUp, ZoomIn, FadeInLeft } from 'react-native-reanimated';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const STEPS = [
  {
    icon: 'search-outline',
    title: 'Find What You Need',
    desc: 'Look for things around you. Need a drill or a fancy dress? It is all here!',
    color: '#E3F2FD',
    iconColor: '#2196F3'
  },
  {
    icon: 'chatbubbles-outline',
    title: 'Ask Your Neighbor',
    desc: 'Send a quick message. Most neighbors love to help and share!',
    color: '#E8F5E9',
    iconColor: '#4CAF50'
  },
  {
    icon: 'hand-left-outline',
    title: 'Meet & Borrow',
    desc: 'Meet up, say "Hi!", and take the item home. It is that simple!',
    color: '#FFF3E0',
    iconColor: '#FF9800'
  },
  {
    icon: 'return-up-back-outline',
    title: 'Give It Back',
    desc: 'When you are done, give it back with a big "Thank You!".',
    color: '#FCE4EC',
    iconColor: '#E91E63'
  }
];

export default function HowItWorksScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} scrollable={true} backgroundColor={COLORS.white}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={scale(24)} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>How it Works</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Section 1: What is CircleUp? */}
        <Animated.View entering={FadeInDown.delay(200).duration(800)} style={styles.heroSection}>
          <LinearGradient
            colors={['#E3F2FD', '#E1F5FE']}
            style={styles.heroGradient}
          >
            <Animated.View entering={ZoomIn.delay(400)} style={styles.heroIconContainer}>
              <MaterialCommunityIcons name="Parent" size={scale(40)} color={COLORS.primary} />
              <Ionicons name="heart" size={scale(20)} color={COLORS.accent} style={styles.heartIcon} />
            </Animated.View>
            <Text style={styles.heroTitle}>What is CircleUp?</Text>
            <Text style={styles.heroDesc}>
              Imagine a giant toy box for your whole street! CircleUp lets neighbors share things so nobody has to buy everything themselves. It is like a big library for tools, clothes, and more!
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Section 2: Four Simple Steps */}
        <View style={styles.section}>
          <Animated.Text entering={FadeInLeft} style={styles.sectionTitle}>Four Simple Steps</Animated.Text>
          {STEPS.map((step, index) => (
            <Animated.View 
              key={index} 
              entering={FadeInDown.delay(600 + index * 100).duration(800)}
              style={styles.stepCard}
            >
              <View style={[styles.stepIconBox, { backgroundColor: step.color }]}>
                <Ionicons name={step.icon as any} size={scale(28)} color={step.iconColor} />
              </View>
              <View style={styles.stepTextContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Section 3: Using the App */}
        <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.cardSection}>
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="phone-portrait-outline" size={scale(24)} color={COLORS.accent} />
              <Text style={styles.cardTitle}>How to use this app?</Text>
            </View>
            <Text style={styles.cardBody}>
              It is super easy! Just search for what you want in the "Vault". Use the "Radar" to see whats nearby. When you find something cool, tap "Express Interest" and talk to your neighbor!
            </Text>
          </View>
        </Animated.View>

        {/* Section 4: Earning Money */}
        <Animated.View entering={FadeInDown.delay(1200).duration(800)} style={styles.cardSection}>
          <View style={[styles.infoCard, { borderColor: '#FFF176', backgroundColor: '#FFFDE7' }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="cash-outline" size={scale(24)} color="#FBC02D" />
              <Text style={styles.cardTitle}>Can I earn money?</Text>
            </View>
            <Text style={styles.cardBody}>
              Yes! If you have a cool bike, a camera, or a drill that you are not using, you can "List it" on CircleUp. When neighbors borrow it, they give you "Karma Coins" and real money too! It is like your toys are earning money for you!
            </Text>
          </View>
        </Animated.View>

        {/* Closing */}
        <Animated.View entering={FadeInUp.delay(1400)} style={styles.footer}>
          <Text style={styles.footerText}>Ready to join the circle?</Text>
          <TouchableOpacity 
            style={styles.startBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.startBtnText}>LET'S GO!</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.m,
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: COLORS.lightGrey,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: normalize(18),
    fontWeight: '900',
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(20),
  },
  heroSection: {
    marginBottom: verticalScale(30),
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  heroGradient: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  heroIconContainer: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.m,
  },
  heartIcon: {
    position: 'absolute',
    top: scale(5),
    right: scale(5),
  },
  heroTitle: {
    fontSize: normalize(24),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.s,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: normalize(15),
    fontWeight: '600',
    color: COLORS.grey,
    lineHeight: normalize(22),
    textAlign: 'center',
  },
  section: { marginBottom: verticalScale(20) },
  sectionTitle: {
    fontSize: normalize(20),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.m,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.m,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  stepIconBox: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.m,
  },
  stepTextContent: { flex: 1 },
  stepTitle: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: normalize(13),
    fontWeight: '600',
    color: COLORS.grey,
    lineHeight: normalize(18),
  },
  cardSection: { marginBottom: verticalScale(20) },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.l,
    borderWidth: 2,
    borderColor: '#E3F2FD',
    ...SHADOWS.soft,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
    gap: SPACING.s,
  },
  cardTitle: {
    fontSize: normalize(18),
    fontWeight: '900',
    color: COLORS.primary,
  },
  cardBody: {
    fontSize: normalize(14),
    fontWeight: '600',
    color: COLORS.grey,
    lineHeight: normalize(20),
  },
  footer: {
    alignItems: 'center',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(20),
  },
  footerText: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.m,
  },
  startBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: scale(40),
    paddingVertical: verticalScale(15),
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.accent,
  },
  startBtnText: {
    fontSize: normalize(16),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
});
