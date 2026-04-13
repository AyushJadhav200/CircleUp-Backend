import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSpring, 
  runOnJS, 
  Easing,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { scale, normalize } from '../../constants/responsive';
import { COLORS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface Props {
  onAnimationComplete: () => void;
}

export const AnimatedSplashScreen = ({ onAnimationComplete }: Props) => {
  const [appIsReady, setAppIsReady] = useState(false);

  // Animation values
  const bgOpacity = useSharedValue(1);
  const personALeft = useSharedValue(-100); // Slide in from left
  const personBRight = useSharedValue(-100); // Slide in from right
  const toolX = useSharedValue(0); // Starts at Person A relative position
  const toolOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Hide the native splash screen smoothly
    SplashScreen.hideAsync().catch(() => {
      /* ignore */
    });

    // 2. Start Animation Sequence
    // Person A slides in
    personALeft.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) });

    // Person B slides in
    personBRight.value = withDelay(
      300, 
      withTiming(0, { duration: 600, easing: Easing.out(Easing.exp) })
    );

    // Tool fades in on Person A
    toolOpacity.value = withDelay(1000, withTiming(1, { duration: 300 }));

    // Text fades in
    textOpacity.value = withDelay(1200, withTiming(1, { duration: 500 }));

    // Tool travels to Person B
    const travelDistance = scale(120); // Distance between the two people avatars
    toolX.value = withDelay(
      1500, 
      withSpring(travelDistance, { damping: 12, stiffness: 90 })
    );

    // Fade out everything and complete
    bgOpacity.value = withDelay(
      2800, 
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(onAnimationComplete)();
        }
      })
    );
  }, []);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [
      {
        scale: interpolate(bgOpacity.value, [0, 1], [1.1, 1], Extrapolation.CLAMP),
      }
    ]
  }));

  const personAStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: personALeft.value }]
  }));

  const personBStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -personBRight.value }]
  }));

  const travelDistance = scale(120);

  const toolStyle = useAnimatedStyle(() => ({
    opacity: toolOpacity.value,
    transform: [
      { translateX: toolX.value },
      { rotate: interpolate(toolX.value, [0, travelDistance], [0, 360]) + 'deg' } // spin while moving!
    ]
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, bgStyle]}>
      <StatusBar style="light" />
      
      <View style={styles.animationStage}>
        {/* Person A */}
        <Animated.View style={[styles.avatarBox, personAStyle]}>
          <View style={styles.circle}>
            <Image 
              source={{ uri: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Alice&backgroundColor=b6e3f4' }} 
              style={{ width: scale(64), height: scale(64), borderRadius: scale(32) }} 
            />
          </View>
        </Animated.View>

        {/* The Tool */}
        <Animated.View style={[styles.toolContainer, toolStyle]}>
            <Ionicons name="build-outline" size={scale(36)} color={COLORS.accent} />
        </Animated.View>

        {/* Person B */}
        <Animated.View style={[styles.avatarBox, personBStyle]}>
          <View style={[styles.circle, { backgroundColor: COLORS.accent }]}>
             <Image 
               source={{ uri: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Bob&backgroundColor=c0aede' }} 
               style={{ width: scale(64), height: scale(64), borderRadius: scale(32) }} 
             />
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.brandContainer, textStyle]}>
         <View style={styles.logoRow}>
            <Text style={styles.logoCircle}>Circle</Text>
            <Text style={styles.logoUp}>Up</Text>
         </View>
         <Text style={styles.slogan}>Build Together, Borrow Wisely.</Text>
      </Animated.View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary,
    zIndex: 9999, // Ensure it sits on top of navigation
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: scale(200),
    height: scale(100),
  },
  avatarBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: scale(70),
    height: scale(70),
    borderRadius: scale(35),
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  toolContainer: {
    position: 'absolute',
    left: scale(16), 
    top: -scale(30),
    zIndex: 10,
    backgroundColor: COLORS.white,
    padding: scale(8),
    borderRadius: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  brandContainer: {
    position: 'absolute',
    bottom: height * 0.15,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  logoCircle: {
      fontSize: normalize(32),
      fontWeight: '900',
      color: COLORS.white,
      letterSpacing: -1,
  },
  logoUp: {
      fontSize: normalize(32),
      fontWeight: '900',
      color: COLORS.accent,
      letterSpacing: -1,
  },
  slogan: {
      fontSize: normalize(14),
      fontWeight: '800',
      color: COLORS.lightGrey,
      letterSpacing: 0.5,
  }
});
