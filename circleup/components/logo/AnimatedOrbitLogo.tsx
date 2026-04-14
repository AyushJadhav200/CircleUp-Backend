import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withRepeat, 
  withTiming, 
  Easing,
  interpolate,
  withDelay,
  useAnimatedStyle
} from 'react-native-reanimated';
import { scale } from '../../constants/responsive';
import { COLORS } from '../../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  size?: number;
  animating?: boolean;
}

export const AnimatedOrbitLogo = ({ size = scale(160), animating = true }: Props) => {
  const rotation1 = useSharedValue(0);
  const rotation2 = useSharedValue(0);
  const rotation3 = useSharedValue(0);
  const scaleValue = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (animating) {
      // Scale and Fade In
      scaleValue.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.5)) });
      opacity.value = withTiming(1, { duration: 800 });

      // Continuous Rotations at different speeds
      rotation1.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );
      rotation2.value = withRepeat(
        withTiming(-360, { duration: 12000, easing: Easing.linear }),
        -1,
        false
      );
      rotation3.value = withRepeat(
        withTiming(360, { duration: 15000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [animating]);

  const orbit1Props = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation1.value}deg` }]
  }));

  const orbit2Props = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation2.value}deg` }]
  }));

  const orbit3Props = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation3.value}deg` }]
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: opacity.value,
  }));

  const centerX = 100;
  const centerY = 100;

  return (
    <Animated.View style={[containerStyle, { width: size, height: size }]}>
      <Svg viewBox="0 0 200 200" width="100%" height="100%">
        <G transform="translate(100, 100)">
           <Path 
            d="M -20,-30 A 35,35 0 1,0 -20,30" 
            fill="none" 
            stroke={COLORS.accent} 
            strokeWidth="12" 
            strokeLinecap="round" 
           />
           <Circle cx="-5" cy="0" r="5" fill={COLORS.accent} />
        </G>
        <Circle cx={centerX} cy={centerY} r="45" stroke={COLORS.primary} strokeWidth="1.5" fill="none" opacity={0.2} />
        <AnimatedG animatedProps={orbit1Props} origin={`${centerX}, ${centerY}`}>
          <Circle cx={centerX + 45} cy={centerY} r="6" fill="#A8D672" />
          <Circle cx={centerX - 45} cy={centerY} r="4" fill="#2D3E50" />
        </AnimatedG>
        <Circle cx={centerX} cy={centerY} r="65" stroke={COLORS.primary} strokeWidth="1.5" fill="none" opacity={0.15} />
        <AnimatedG animatedProps={orbit2Props} origin={`${centerX}, ${centerY}`}>
          <Circle cx={centerX} cy={centerY - 65} r="8" fill="#4FBDBA" />
          <Circle cx={centerX} cy={centerY + 65} r="5" fill="#F9C80E" />
        </AnimatedG>
        <Circle cx={centerX} cy={centerY} r="85" stroke={COLORS.primary} strokeWidth="1" fill="none" opacity={0.1} />
        <AnimatedG animatedProps={orbit3Props} origin={`${centerX}, ${centerY}`}>
          <Circle cx={centerX + 60} cy={centerY - 60} r="7" fill="#F8665A" />
        </AnimatedG>
      </Svg>
    </Animated.View>
  );
};
