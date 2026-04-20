import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeOut,
  ScaleInCenter,
  ScaleOutCenter,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import LottieView from 'lottie-react-native';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { useToast } from './common/ToastProvider';

const { width } = Dimensions.get('window');

interface ReferralModalProps {
  isVisible: boolean;
  onClose: () => void;
  referralCode: string;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({ isVisible, onClose, referralCode }) => {
  const { showToast } = useToast();
  const scaleValue = useSharedValue(1);
  const webLink = `https://circleup-backend-1.onrender.com/join?code=${referralCode}`;
  const appLink = `circleup://referral?code=${referralCode}`;
  const referralLink = Platform.OS === 'ios' ? appLink : webLink;

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  const handleCopyCode = async () => {
    scaleValue.value = withSpring(0.9, { damping: 10 }, () => {
      scaleValue.value = withSpring(1);
    });
    
    await Clipboard.setStringAsync(referralCode);
    showToast('Referral code copied! 📋', 'success');
  };

  const handleShareLink = async () => {
    try {
      const message = `Hey! Join me on CircleUp - the best place to borrow and lend tools with neighbors. Use my code ${referralCode} to get 20 Karma points! \n\nDownload here: ${referralLink}`;
      
      const result = await Share.share({
        message,
        url: referralLink, // iOS only
        title: 'Join CircleUp',
      });

      if (result.action === Share.sharedAction) {
        showToast('Shared successfully! 🚀', 'success');
      }
    } catch (error: any) {
      showToast('Sharing failed.', 'error');
    }
  };

  if (!isVisible) return null;

  return (
    <Modal
      transparent
      visible={isVisible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <Animated.View 
          entering={ScaleInCenter} 
          leaving={ScaleOutCenter}
          style={styles.modalContainer}
        >
          {/* Decorative Top Section */}
          <View style={styles.topSection}>
            <LottieView
              source={require('../assets/lottie/gift.json')} // I'll ensure this exists or use a fallback
              autoPlay
              loop
              style={styles.lottieIcon}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={scale(24)} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>Invite Friends</Text>
            <Text style={styles.subtitle}>
              Share CircleUp with your friends. You'll get <Text style={styles.highlight}>50 Karma</Text> when they complete 5 orders, and they get <Text style={styles.highlight}>20 Karma</Text> on signup!
            </Text>

            <View style={styles.codeContainer}>
              <View style={styles.codeLabelRow}>
                <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
              </View>
              <TouchableOpacity 
                activeOpacity={0.8}
                onPress={handleCopyCode}
                style={styles.codeBox}
              >
                <Text style={styles.codeText}>{referralCode}</Text>
                <Ionicons name="copy-outline" size={scale(20)} color={COLORS.accent} />
              </TouchableOpacity>
            </View>

            <Animated.View style={[styles.actionRow, animatedButtonStyle]}>
              <TouchableOpacity 
                style={styles.shareButton} 
                onPress={handleShareLink}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="share-variant" size={scale(20)} color={COLORS.primary} />
                <Text style={styles.shareBtnText}>Share Link</Text>
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.footerText}>
              Karma points help you rank higher in the community leaderboard!
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  topSection: {
    height: verticalScale(140),
    backgroundColor: '#FFF8E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieIcon: {
    width: scale(120),
    height: scale(120),
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.m,
    right: SPACING.m,
    padding: SPACING.s,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: scale(20),
  },
  content: {
    padding: SPACING.l,
    alignItems: 'center',
  },
  title: {
    fontSize: normalize(24),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.s,
  },
  subtitle: {
    fontSize: normalize(14),
    color: COLORS.grey,
    textAlign: 'center',
    lineHeight: normalize(20),
    paddingHorizontal: SPACING.s,
    marginBottom: SPACING.l,
  },
  highlight: {
    color: COLORS.accent,
    fontWeight: '800',
  },
  codeContainer: {
    width: '100%',
    marginBottom: SPACING.l,
  },
  codeLabelRow: {
    alignSelf: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: SPACING.m,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: -10,
    zIndex: 1,
  },
  codeLabel: {
    fontSize: normalize(10),
    fontWeight: '800',
    color: COLORS.grey,
    letterSpacing: 1,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.divider,
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.m,
    paddingVertical: SPACING.l,
    backgroundColor: '#FAFAFA',
    gap: SPACING.m,
  },
  codeText: {
    fontSize: normalize(22),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 4,
  },
  actionRow: {
    width: '100%',
  },
  shareButton: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.m,
    borderRadius: BORDER_RADIUS.m,
    gap: SPACING.s,
    ...SHADOWS.soft,
  },
  shareBtnText: {
    fontSize: normalize(16),
    fontWeight: '800',
    color: COLORS.primary,
  },
  footerText: {
    fontSize: normalize(11),
    color: COLORS.grey,
    textAlign: 'center',
    marginTop: SPACING.l,
    fontStyle: 'italic',
  },
});
