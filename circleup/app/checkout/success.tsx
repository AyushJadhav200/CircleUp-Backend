import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  ZoomIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay,
  withSequence
} from 'react-native-reanimated';
import { AdaptiveScreen } from '../../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../../constants/theme';

export default function OrderSuccessScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams();
  
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);

  useEffect(() => {
    checkmarkScale.value = withDelay(400, withSpring(1, { damping: 12 }));
    checkmarkOpacity.value = withDelay(400, withSpring(1));

    // Prevent going back
    const backAction = () => {
      router.replace('/(tabs)/vault');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const animatedCheckmark = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkOpacity.value,
  }));

  const isRental = type === 'rental';

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} backgroundColor={COLORS.white} scrollable={false}>
      <StatusBar style="dark" />
      
      <View style={styles.content}>
        {/* Celebration Animation */}
        <View style={styles.iconContainer}>
          <Animated.View style={[styles.circleBg, animatedCheckmark]} />
          <Animated.View style={[styles.checkmarkBox, animatedCheckmark]}>
            <Ionicons name="checkmark" size={scale(60)} color={COLORS.white} />
          </Animated.View>
          
          {/* Decorative bits */}
          <Animated.View entering={ZoomIn.delay(600)} style={[styles.decor, { top: -20, left: 20 }]}>
            <Ionicons name="sparkles" size={24} color={COLORS.accent} />
          </Animated.View>
          <Animated.View entering={ZoomIn.delay(800)} style={[styles.decor, { bottom: 20, right: -10 }]}>
            <MaterialCommunityIcons name="party-popper" size={24} color={COLORS.accent} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(700).duration(800)} style={styles.textContainer}>
          <Text style={styles.title}>Order Placed!</Text>
          <Text style={styles.subtitle}>
            {isRental 
              ? "Your tool is being prepared. Your neighbor will be notified to confirm the handover."
              : "Your essentials are booked! You'll receive a notification when they're ready for pickup."}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(1000).duration(800)} style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name={isRental ? "calendar" : "cube"} size={20} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>{isRental ? "Handover Timing" : "Preparation Time"}</Text>
              <Text style={styles.infoValue}>{isRental ? "Usually within 2-4 hours" : "Ready in 30 minutes"}</Text>
            </View>
          </View>
          
          <View style={[styles.infoRow, { marginTop: 16 }]}>
            <View style={styles.infoIcon}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Trust Guarantee</Text>
              <Text style={styles.infoValue}>Your payment is secured until return.</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <Animated.View entering={FadeInDown.delay(1200)}>
            <TouchableOpacity 
              style={styles.primaryBtn}
              onPress={() => router.replace('/(tabs)/activity')}
            >
              <Text style={styles.primaryBtnText}>TRACK MY ORDER</Text>
              <Ionicons name="arrow-forward" size={20} color="white" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(1400)}>
            <TouchableOpacity 
              style={styles.secondaryBtn}
              onPress={() => router.replace('/(tabs)/vault')}
            >
              <Text style={styles.secondaryBtnText}>CONTINUE EXPLORING</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </AdaptiveScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: SPACING.xl 
  },
  iconContainer: { 
    width: scale(140), 
    height: scale(140), 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: verticalScale(40)
  },
  circleBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    borderRadius: scale(70),
  },
  checkmarkBox: {
    width: scale(100),
    height: scale(100),
    backgroundColor: COLORS.success,
    borderRadius: scale(50),
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  decor: { position: 'absolute' },
  textContainer: { alignItems: 'center', marginBottom: verticalScale(40) },
  title: { 
    fontSize: normalize(32), 
    fontWeight: '900', 
    color: COLORS.primary, 
    marginBottom: 12,
    letterSpacing: -1
  },
  subtitle: { 
    fontSize: normalize(15), 
    color: COLORS.grey, 
    textAlign: 'center', 
    lineHeight: 22,
    fontWeight: '600'
  },
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.l,
    marginBottom: verticalScale(60),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { 
    width: scale(40), 
    height: scale(40), 
    backgroundColor: COLORS.white, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  infoLabel: { fontSize: normalize(11), fontWeight: '800', color: COLORS.grey, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: normalize(14), fontWeight: '700', color: COLORS.primary, marginTop: 2 },
  footer: { width: '100%', gap: 12 },
  primaryBtn: {
    height: verticalScale(60),
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: normalize(15), letterSpacing: 1 },
  secondaryBtn: {
    height: verticalScale(56),
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: normalize(14), letterSpacing: 0.5 },
});
