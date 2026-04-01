import { normalize, scale, verticalScale } from './responsive';

export const COLORS = {
  primary: '#001A33',
  accent: '#FF9900',
  secondary: '#FFB84D',
  white: '#FFFFFF',
  grey: '#8E8E8E',
  lightGrey: '#F5F7FA',
  divider: '#E5E5EA',
  success: '#2ECC71',
  error: '#FF3B30',
  impactGreen: 'rgba(46, 204, 113, 0.1)',
  cardShadow: '#000000',
  black: '#000000',
};

export const SPACING = {
  xs: scale(4),
  s: scale(8),
  m: scale(16),
  l: scale(24),
  xl: scale(32),
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: normalize(32),
    fontWeight: '900',
  },
  h2: {
    fontSize: normalize(24),
    fontWeight: '800',
  },
  h3: {
    fontSize: normalize(20),
    fontWeight: '800',
  },
  body: {
    fontSize: normalize(15),
    fontWeight: '500',
  },
  caption: {
    fontSize: normalize(11),
    fontWeight: '800',
    letterSpacing: 1,
  },
};

export const SHADOWS = {
  soft: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  accent: {
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const BORDER_RADIUS = {
  s: scale(8),
  m: scale(15),
  l: scale(24),
  xl: scale(32),
};
