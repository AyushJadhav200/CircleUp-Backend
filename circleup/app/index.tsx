import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { api, TOKEN_KEY } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useToast } from '../components/common/ToastProvider';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// Replace these with your actual IDs from Google Cloud Console
const WEB_CLIENT_ID = "729882013672-fnm7jd8hbl0f6glonbqfnounm2m0ccjt.apps.googleusercontent.com";
const IOS_CLIENT_ID = "PASTE_YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com"; // Get from Google Console
const ANDROID_CLIENT_ID = "PASTE_YOUR_ANDROID_CLIENT_ID_HERE.apps.googleusercontent.com"; // Get from Google Console

export default function HomeScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { height, width } = useWindowDimensions();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Responsive scaling logic for hero image
  const heroImageHeight = height < 700 ? verticalScale(200) : verticalScale(260);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          // Token exists, jump straight to the app
          router.replace('/(tabs)/vault' as any);
        }
      } catch (e) {
        console.error('[AuthCheck] Error:', e);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    // For Expo Go, you might need this:
    // useProxy: true, 
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = (response as any).params;
      handleGoogleLoginSuccess(id_token);
    }
  }, [response]);

  const handleGoogleLoginSuccess = async (idToken: string) => {
    setIsGoogleLoading(true);
    try {
      const res = await api.post('/auth/google', { idToken });
      await SecureStore.setItemAsync(TOKEN_KEY, res.data.access_token);
      showToast('Welcome to CircleUp! 🎉', 'success');
      router.replace('/(tabs)/vault' as any);
    } catch (error: any) {
      console.error('Google Login Error:', error.response?.data || error.message);
      showToast('Google Sign-In failed. Please try again.', 'error');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <AdaptiveScreen
      style={styles.container}
      horizontalPadding={0}
      scrollable={height < 700} // Only scrollable on small devices
      backgroundColor={COLORS.white}
      edgeToEdge={true}
    >
      <StatusBar style="dark" />

      {/* 1. Header Section */}
      <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitleCircle}>Circle</Text>
          <Text style={styles.headerTitleUp}>Up</Text>
        </View>
        <TouchableOpacity
          style={styles.exploreBtn}
          onPress={() => router.push('/(tabs)/radar' as any)}
        >
          <Text style={styles.exploreBtnText}>EXPLORE</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 2. Hero Text Section */}
      <View style={styles.contentWrapper}>
        <Animated.View entering={FadeInDown.delay(400).duration(800)} style={styles.heroTextContainer}>
          <Text
            style={styles.heroTitle}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            Build Together,{"\n"}Borrow Wisely.
          </Text>
          <Text style={styles.heroSubtitle}>
            Join your curated neighborhood library of tools, resources, and shared skills.
          </Text>
        </Animated.View>

        {/* 3. Hero Visual Section */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(800)}
          style={[styles.heroImageContainer, { height: heroImageHeight }]}
        >
          <Image
            source={require('../assets/images/login_image1.png')}
            style={styles.heroImage}
            contentFit="cover"
          />
          <View style={styles.imageOverlay}>
            <View style={styles.trustBadge}>
              <Ionicons name="shield-checkmark" size={scale(14)} color={COLORS.white} />
              <Text style={styles.trustText}>LOCAL HANDOVER VERIFIED</Text>
            </View>
          </View>
        </Animated.View>

        {/* 4. Action Section */}
        <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.authSection}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={() => promptAsync()}
            disabled={!request || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <Text style={styles.googleBrandText}>GOOGLE</Text>
                <Text style={styles.googleActionText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => router.push('/login' as any)}
          >
            <Ionicons name="mail-outline" size={scale(20)} color={COLORS.primary} />
            <Text style={styles.phoneButtonText}>Continue with Email</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* 5. Footer Trust Stats */}
        <Animated.View entering={FadeInDown.delay(1000).duration(800)} style={styles.footerStats}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>12k+</Text>
            <Text style={styles.statLabel}>TOOLS SHARED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>4.9/5</Text>
            <Text style={styles.statLabel}>NEIGHBOR RATING</Text>
          </View>
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(1200).duration(800)} style={styles.legalText}>
          By continuing, you agree to our{" "}
          <Text style={styles.legalLink}>Terms</Text> and{" "}
          <Text style={styles.legalLink}>Privacy</Text>
        </Animated.Text>
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
    paddingTop: verticalScale(15),
    paddingBottom: verticalScale(10),
  },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitleCircle: {
    fontSize: normalize(26),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  headerTitleUp: {
    fontSize: normalize(26),
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: -1,
  },
  exploreBtn: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: BORDER_RADIUS.s,
    backgroundColor: COLORS.lightGrey,
  },
  exploreBtnText: {
    fontSize: normalize(10),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.l,
    justifyContent: 'space-between',
    paddingBottom: verticalScale(20),
  },
  heroTextContainer: { marginTop: verticalScale(15) },
  heroTitle: {
    fontSize: normalize(38),
    fontWeight: '900',
    color: COLORS.primary,
    lineHeight: normalize(44),
    marginBottom: verticalScale(8),
    letterSpacing: -1.5,
  },
  heroSubtitle: {
    fontSize: normalize(15),
    color: COLORS.grey,
    lineHeight: normalize(22),
    fontWeight: '600',
  },
  heroImageContainer: {
    width: '100%',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.medium,
    marginVertical: verticalScale(15),
  },
  heroImage: { width: '100%', height: '100%', backgroundColor: '#6A9A9A' },
  imageOverlay: { position: 'absolute', bottom: SPACING.m, left: SPACING.m },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: SPACING.s,
    paddingVertical: verticalScale(6),
    borderRadius: BORDER_RADIUS.s,
  },
  trustText: {
    color: COLORS.white,
    fontSize: normalize(9),
    fontWeight: '900',
    marginLeft: SPACING.xs,
    letterSpacing: 0.5,
  },
  authSection: { gap: verticalScale(12) },
  googleButton: {
    width: '100%',
    height: verticalScale(60),
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.accent,
  },
  googleBrandText: {
    fontSize: normalize(18),
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
    marginRight: SPACING.m,
  },
  googleActionText: { fontSize: normalize(15), fontWeight: '900', color: COLORS.primary },
  phoneButton: {
    width: '100%',
    height: verticalScale(56),
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneButtonText: {
    fontSize: normalize(15),
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: SPACING.s,
  },
  footerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: verticalScale(10),
  },
  statBox: { alignItems: 'center', paddingHorizontal: SPACING.l },
  statNumber: { fontSize: normalize(18), fontWeight: '900', color: COLORS.primary },
  statLabel: { fontSize: normalize(9), fontWeight: '800', color: COLORS.divider, marginTop: 2 },
  statDivider: { width: 1, height: verticalScale(20), backgroundColor: COLORS.divider },
  legalText: {
    fontSize: normalize(11),
    color: COLORS.grey,
    textAlign: 'center',
    fontWeight: '600',
  },
  legalLink: { textDecorationLine: 'underline', color: COLORS.primary },
});