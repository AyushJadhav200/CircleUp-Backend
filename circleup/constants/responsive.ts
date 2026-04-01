import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard iPhone 13 mini / iPhone SE
const GUIDELINE_BASE_WIDTH = 375;
const GUIDELINE_BASE_HEIGHT = 812;

/**
 * Scales a dimension horizontally based on device width.
 * Standard for margins, paddings, and widths.
 */
export const scale = (size: number) => (SCREEN_WIDTH / GUIDELINE_BASE_WIDTH) * size;

/**
 * Scales a dimension vertically based on device height.
 * Standard for heights.
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / GUIDELINE_BASE_HEIGHT) * size;

/**
 * Moderate scaling for situations where you want a size to scale but not as aggressively.
 * Standard for border radii and icon sizes.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Normalizes font size based on pixel density and screen scale.
 * Ensures text scales naturally on high-density displays.
 */
export const normalize = (size: number) => {
  const newSize = (SCREEN_WIDTH / GUIDELINE_BASE_WIDTH) * size;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
  }
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
