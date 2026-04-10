import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback,
  Keyboard, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  FadeIn, FadeInDown, FadeInUp,
  SlideInRight, SlideOutLeft,
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, TOKEN_KEY } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { useToast } from '../components/common/ToastProvider';

type Step = 'phone' | 'otp' | 'name';

export default function LoginFlowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('phone');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isNewUser, setIsNewUser] = useState(false);

  const otpInputs = useRef<Array<TextInput | null>>([]);
  const phoneInputRef = useRef<TextInput>(null);

  const pinBoxSize = Math.floor((width - SPACING.l * 2 - SPACING.s * 5) / 6);

  // Resend countdown timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpInputs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const isEmailValid = email.includes('@') && email.includes('.');
  const isOtpComplete = otp.every(d => d !== '');

  const handleSendOTP = async () => {
    if (!isEmailValid) return;
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const response = await api.post('/auth/send-otp', { email: cleanEmail });
      setStep('otp');
      setResendTimer(30);
      // Auto-focus first OTP box
      setTimeout(() => otpInputs.current[0]?.focus(), 400);
      showToast(response.data.message || 'OTP sent to your email! ✉️', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Failed to send OTP.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!isOtpComplete) return;
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const response = await api.post('/auth/verify-otp', {
        email: cleanEmail,
        otp: otp.join(''),
      });
      const { access_token, is_new_user } = response.data;

      if (is_new_user) {
        // Store token but show name entry step
        await SecureStore.setItemAsync(TOKEN_KEY, access_token);
        setIsNewUser(true);
        setStep('name');
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, access_token);
        showToast('Welcome back! 🎉', 'success');
        router.replace('/(tabs)/vault' as any);
      }
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Invalid OTP. Try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetName = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await api.patch('/auth/me', { name: name.trim() });
      showToast(`Welcome to CircleUp, ${name.trim()}! 🎉`, 'success');
      router.replace('/(tabs)/vault' as any);
    } catch (err: any) {
      // Even if the patch fails, let the user in
      router.replace('/(tabs)/vault' as any);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    setOtp(['', '', '', '', '', '']);
    await handleSendOTP();
  };

  const extractDomain = email?.split('@')[1] || '';
  const maskedEmail = email ? `${email.substring(0, 3)}***@${extractDomain}` : '';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { paddingTop: insets.top + SPACING.s, paddingBottom: insets.bottom + SPACING.m }]}>
          <StatusBar style="light" />

          {/* Header */}
          <View style={styles.header}>
            {step !== 'phone' ? (
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  if (step === 'otp') { setStep('phone'); setOtp(['', '', '', '', '', '']); }
                  else if (step === 'name') setStep('otp');
                }}
              >
                <Ionicons name="arrow-back" size={scale(22)} color={COLORS.white} />
              </TouchableOpacity>
            ) : <View style={{ width: scale(44) }} />}

            <Animated.View entering={FadeIn.duration(600)} style={styles.logoContainer}>
              <Text style={styles.logoCircle}>Circle</Text>
              <Text style={styles.logoUp}>Up</Text>
            </Animated.View>
            <View style={{ width: scale(44) }} />
          </View>

          {/* Hero Tagline */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.heroSection}>
            <Text style={styles.heroEmoji}>🛠️</Text>
            <Text style={styles.heroTitle}>
              {step === 'phone' && 'Share tools,\nbuild community.'}
              {step === 'otp' && 'Verify your\nemail.'}
              {step === 'name' && "What should\nwe call you?"}
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View entering={FadeInUp.delay(300).duration(600)} style={styles.card}>

            {/* STEP 1: Phone Entry */}
            {step === 'phone' && (
              <Animated.View entering={SlideInRight.duration(400)} key="phone">
                <Text style={styles.cardLabel}>Email Address</Text>
                <View style={styles.phoneRow}>
                  <TextInput
                    ref={phoneInputRef}
                    style={styles.phoneInput}
                    placeholder="name@example.com"
                    placeholderTextColor={COLORS.grey}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, (!isEmailValid || isLoading) && styles.buttonDisabled]}
                  onPress={handleSendOTP}
                  disabled={!isEmailValid || isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator color={COLORS.primary} />
                    : <>
                        <Text style={styles.primaryButtonText}>Send OTP</Text>
                        <Ionicons name="arrow-forward" size={scale(18)} color={COLORS.primary} style={{ marginLeft: SPACING.s }} />
                      </>
                  }
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Google Button */}
                <TouchableOpacity style={styles.googleButton}>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </Animated.View>
            )}

            {/* STEP 2: OTP Entry */}
            {step === 'otp' && (
              <Animated.View entering={SlideInRight.duration(400)} key="otp">
                <Text style={styles.cardLabel}>Verification Code</Text>
                <Text style={styles.cardSubLabel}>
                  Sent to <Text style={{ color: COLORS.accent, fontWeight: '800' }}>{maskedEmail}</Text>
                </Text>

                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpInputs.current[index] = ref; }}
                      style={[styles.otpBox, { width: pinBoxSize, height: pinBoxSize }, digit ? styles.otpBoxFilled : {}]}
                      keyboardType="number-pad"
                      maxLength={1}
                      value={digit}
                      onChangeText={(val) => handleOtpChange(val, index)}
                      onKeyPress={(e) => handleOtpKeyPress(e, index)}
                      textAlign="center"
                      autoFocus={index === 0}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, (!isOtpComplete || isLoading) && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={!isOtpComplete || isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator color={COLORS.primary} />
                    : <Text style={styles.primaryButtonText}>Verify & Continue</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendRow} onPress={handleResendOTP} disabled={resendTimer > 0}>
                  <Ionicons name="refresh" size={scale(14)} color={resendTimer > 0 ? COLORS.grey : COLORS.accent} />
                  <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
                    {resendTimer > 0 ? ` Resend OTP in ${resendTimer}s` : ' Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* STEP 3: Name Entry (new users) */}
            {step === 'name' && (
              <Animated.View entering={SlideInRight.duration(400)} key="name">
                <Text style={styles.cardLabel}>Your Name</Text>
                <Text style={styles.cardSubLabel}>So your neighbors know who you are!</Text>

                <View style={styles.nameInputWrapper}>
                  <Ionicons name="person-outline" size={scale(20)} color={COLORS.grey} style={{ marginRight: SPACING.s }} />
                  <TextInput
                    style={styles.nameInput}
                    placeholder="e.g. Ayush"
                    placeholderTextColor={COLORS.grey}
                    autoCapitalize="words"
                    autoFocus
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, (!name.trim() || isLoading) && styles.buttonDisabled]}
                  onPress={handleSetName}
                  disabled={!name.trim() || isLoading}
                >
                  {isLoading
                    ? <ActivityIndicator color={COLORS.primary} />
                    : <>
                        <Text style={styles.primaryButtonText}>Join CircleUp</Text>
                        <Text style={{ marginLeft: SPACING.s, fontSize: normalize(18) }}>🎉</Text>
                      </>
                  }
                </TouchableOpacity>
              </Animated.View>
            )}
          </Animated.View>

          <Text style={styles.footerText}>🔒 Your data is encrypted and never shared.</Text>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.primary },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.l,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.m,
  },
  backButton: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoCircle: { fontSize: normalize(24), fontWeight: '900', color: COLORS.white },
  logoUp: { fontSize: normalize(24), fontWeight: '900', color: COLORS.accent },

  // Hero
  heroSection: { alignItems: 'center', marginBottom: verticalScale(32) },
  heroEmoji: { fontSize: normalize(48), marginBottom: SPACING.s },
  heroTitle: {
    fontSize: normalize(30),
    fontWeight: '900',
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: normalize(38),
    letterSpacing: -0.5,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.l,
    padding: SPACING.l,
    ...SHADOWS.medium,
  },
  cardLabel: {
    fontSize: normalize(13),
    fontWeight: '800',
    color: COLORS.grey,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: SPACING.s,
  },
  cardSubLabel: {
    fontSize: normalize(14),
    color: COLORS.grey,
    fontWeight: '600',
    marginBottom: SPACING.m,
  },

  // Phone Input
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.m,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    marginBottom: verticalScale(20),
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.m,
    paddingVertical: verticalScale(16),
    borderRightWidth: 1.5,
    borderRightColor: COLORS.divider,
    backgroundColor: COLORS.white,
    gap: SPACING.xs,
  },
  countryFlag: { fontSize: normalize(18) },
  countryCodeText: { fontSize: normalize(16), fontWeight: '800', color: COLORS.primary },
  phoneInput: {
    flex: 1,
    fontSize: normalize(18),
    fontWeight: '700',
    color: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: verticalScale(16),
    letterSpacing: 1,
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.xl,
    height: verticalScale(58),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(20),
    ...SHADOWS.accent,
  },
  buttonDisabled: { opacity: 0.4 },
  primaryButtonText: {
    fontSize: normalize(17),
    fontWeight: '900',
    color: COLORS.primary,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.divider },
  dividerText: { marginHorizontal: SPACING.m, color: COLORS.grey, fontWeight: '700', fontSize: normalize(13) },

  // Google Button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    borderRadius: BORDER_RADIUS.xl,
    height: verticalScale(54),
    backgroundColor: COLORS.white,
    marginBottom: verticalScale(16),
    gap: SPACING.s,
    ...SHADOWS.soft,
  },
  googleIcon: {
    fontSize: normalize(20),
    fontWeight: '900',
    color: '#4285F4',
    fontFamily: 'serif',
  },
  googleButtonText: {
    fontSize: normalize(16),
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Terms
  termsText: {
    textAlign: 'center',
    fontSize: normalize(11),
    color: COLORS.grey,
    fontWeight: '600',
    lineHeight: normalize(16),
  },
  termsLink: { color: COLORS.accent, fontWeight: '800' },

  // OTP
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(24),
  },
  otpBox: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.s,
    fontSize: normalize(22),
    fontWeight: '800',
    color: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
  },
  otpBoxFilled: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.white,
    ...SHADOWS.soft,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.s,
  },
  resendText: { fontSize: normalize(14), fontWeight: '700', color: COLORS.accent },
  resendDisabled: { color: COLORS.grey },

  // Name Input
  nameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.m,
    borderWidth: 1.5,
    borderColor: COLORS.divider,
    paddingHorizontal: SPACING.m,
    height: verticalScale(60),
    marginBottom: verticalScale(24),
  },
  nameInput: {
    flex: 1,
    fontSize: normalize(18),
    fontWeight: '700',
    color: COLORS.primary,
  },

  // Footer
  footerText: {
    textAlign: 'center',
    fontSize: normalize(12),
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginTop: SPACING.l,
  },
});
