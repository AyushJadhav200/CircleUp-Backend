import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';

export default function ToolGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const GuideStep = ({ icon, title, description, stepNumber, index }: any) => (
    <Animated.View 
        entering={FadeInDown.delay(index * 200).duration(600)} 
        style={styles.stepCard}
    >
      <View style={styles.stepHeader}>
        <View style={styles.stepIconBox}>
          <MaterialCommunityIcons name={icon} size={scale(28)} color={COLORS.accent} />
        </View>
        <View style={styles.stepNumberBadge}>
          <Text style={styles.stepNumberText}>{stepNumber}</Text>
        </View>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
    </Animated.View>
  );

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} backgroundColor={COLORS.primary} edgeToEdge={true}>
      <StatusBar style="light" />
      
      <View style={[styles.header, { paddingTop: insets.top + verticalScale(15) }]}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={scale(28)} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CircleUp Guide</Text>
        <View style={{ width: scale(28) }} />
      </View>

      <View style={styles.body}>
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.heroSection}>
                <Text style={styles.heroTitle}>How CircleUp Works</Text>
                <Text style={styles.heroSubtitle}>
                    Your neighbor's shared library of tools, resources, and skills.
                </Text>
            </View>

            <View style={styles.stepsContainer}>
                <GuideStep 
                    index={1}
                    stepNumber="01"
                    icon="map-search-outline"
                    title="Discover Nearby"
                    description="Open the Radar to see tools available for rent within your immediate neighborhood. Real-time updates ensure you find what you need."
                />
                <GuideStep 
                    index={2}
                    stepNumber="02"
                    icon="hand-coin-outline"
                    title="Borrow with Karma"
                    description="Use your earned Karma points or a small flat fee to rent tools. Verified owners ensure quality and reliability for every exchange."
                />
                <GuideStep 
                    index={3}
                    stepNumber="03"
                    icon="hammer-wrench"
                    title="Lend Your Tools"
                    description="List your own unused equipment to earn Karma and help your neighbors build their projects. You are always in control of who borrows."
                />
                <GuideStep 
                    index={4}
                    stepNumber="04"
                    icon="shield-check-outline"
                    title="Safe Handover"
                    description="Meet up safely in your community, exchange the tool, and confirm the return in the app. Everyone wins when we share."
                />
            </View>

            <View style={styles.ctaSection}>
                <TouchableOpacity 
                    style={styles.ctaButton}
                    onPress={() => router.replace('/(tabs)/radar')}
                >
                    <Text style={styles.ctaButtonText}>Start Exploring</Text>
                    <Ionicons name="arrow-forward" size={scale(20)} color={COLORS.primary} style={{ marginLeft: scale(10) }} />
                </TouchableOpacity>
            </View>

            <View style={{ height: verticalScale(60) }} />
        </ScrollView>
      </View>
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
    paddingBottom: verticalScale(20),
    backgroundColor: COLORS.primary,
  },
  closeButton: { padding: scale(5) },
  headerTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.white, letterSpacing: 0.5 },
  body: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  scrollContent: { flex: 1 },
  heroSection: {
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(40),
    paddingBottom: verticalScale(24),
  },
  heroTitle: {
    fontSize: normalize(32),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: verticalScale(12),
    letterSpacing: -1,
  },
  heroSubtitle: { fontSize: normalize(15), color: COLORS.grey, lineHeight: normalize(22), fontWeight: '600' },
  stepsContainer: { paddingHorizontal: SPACING.l },
  stepCard: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.l,
    marginBottom: verticalScale(20),
    ...SHADOWS.soft,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  stepIconBox: {
    width: scale(56),
    height: scale(56),
    borderRadius: BORDER_RADIUS.m,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.soft,
  },
  stepNumberBadge: {
    backgroundColor: 'rgba(255, 153, 0, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: BORDER_RADIUS.s,
  },
  stepNumberText: { fontSize: normalize(12), fontWeight: '900', color: COLORS.accent },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary, marginBottom: verticalScale(8) },
  stepDescription: { fontSize: normalize(14), color: COLORS.grey, lineHeight: normalize(20), fontWeight: '600' },
  ctaSection: { paddingHorizontal: SPACING.l, marginTop: verticalScale(10) },
  ctaButton: {
    backgroundColor: COLORS.accent,
    height: verticalScale(64),
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.accent,
  },
  ctaButtonText: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
});
