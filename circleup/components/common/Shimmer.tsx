import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS, BORDER_RADIUS } from '../../constants/theme';

interface ShimmerProps {
  width: number | string;
  height: number | string;
  borderRadius?: number;
  style?: any;
}

export const Shimmer: React.FC<ShimmerProps> = ({ width, height, borderRadius = 0, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, [animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 600],
  });

  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden', backgroundColor: '#E1E9EE' }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.shimmerGradient} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  shimmerGradient: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    transform: [{ skewX: '-20deg' }],
  },
});

export const VaultSkeleton = () => (
  <View style={skeletonStyles.card}>
    <Shimmer width="100%" height={180} borderRadius={BORDER_RADIUS.m} />
    <View style={skeletonStyles.details}>
      <Shimmer width="70%" height={24} borderRadius={4} style={{ marginBottom: 8 }} />
      <View style={{ flexDirection: 'row' }}>
        <Shimmer width="30%" height={16} borderRadius={4} style={{ marginRight: 12 }} />
        <Shimmer width="30%" height={16} borderRadius={4} />
      </View>
    </View>
  </View>
);

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: 10,
    marginBottom: 20,
  },
  details: {
    padding: 12,
  },
});
