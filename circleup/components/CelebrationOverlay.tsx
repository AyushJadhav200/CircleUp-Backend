import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  FadeIn, 
  FadeOut, 
  ScaleInCenter,
  ZoomIn,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { scale, normalize } from '../constants/responsive';

const { width, height } = Dimensions.get('window');

interface CelebrationOverlayProps {
  isVisible: boolean;
  onFinish: () => void;
  message: string;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ isVisible, onFinish, message }) => {
  if (!isVisible) return null;

  return (
    <Animated.View 
      entering={FadeIn.duration(500)} 
      leaving={FadeOut.duration(500)} 
      style={styles.overlay}
    >
      <LottieView
        source={require('../assets/lottie/confetti.json')} // Fallback needed
        autoPlay
        loop={false}
        style={styles.confetti}
        onAnimationFinish={onFinish}
      />
      
      <Animated.View 
        entering={ZoomIn.delay(300).springify()} 
        style={styles.card}
      >
        <Text style={styles.emoji}>🎊</Text>
        <Text style={styles.title}>Congratulation!</Text>
        <Text style={styles.message}>{message}</Text>
        
        <View style={styles.karmaBadge}>
          <Text style={styles.karmaText}>+50 Karma</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 42, 76, 0.85)', // Dark navy overlay
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    borderRadius: BORDER_RADIUS.l,
    alignItems: 'center',
    width: width * 0.8,
    ...SHADOWS.medium,
  },
  emoji: {
    fontSize: scale(50),
    marginBottom: SPACING.m,
  },
  title: {
    fontSize: normalize(28),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.s,
  },
  message: {
    fontSize: normalize(16),
    color: '#555',
    textAlign: 'center',
    marginBottom: SPACING.l,
    fontWeight: '600',
  },
  karmaBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.l,
    paddingVertical: SPACING.s,
    borderRadius: BORDER_RADIUS.xl,
    ...SHADOWS.accent,
  },
  karmaText: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: normalize(18),
  },
});
