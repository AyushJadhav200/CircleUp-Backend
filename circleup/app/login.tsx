import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, 
  Keyboard, Alert, useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, TOKEN_KEY, API_URL } from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { useToast } from '../components/common/ToastProvider';

export default function LoginFlowScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { showToast } = useToast();

  const [step, setStep] = useState<'email' | 'pin'>('email');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpInputs = useRef<Array<TextInput | null>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // PIN box size scales with screen width ensuring 6 boxes always fit
  const pinBoxSize = Math.floor((width - SPACING.l * 2 - SPACING.s * 5) / 6);

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

  const isOtpComplete = otp.every(digit => digit !== '');
  const isEmailValid = email.includes('@') && email.includes('.');

  const handleLogin = async () => {
    if (!isOtpComplete) return;
    setIsLoading(true);
    const pin = otp.join('');

    console.log('[Login] Attempting login to:', API_URL + '/auth/login');

    try {
      if (mode === 'signup') {
        const safeName = name.trim() || email.split('@')[0];
        try {
          await api.post('/auth/signup', { name: safeName, email, password: pin });
        } catch (signupErr: any) {
          if (signupErr.response?.status === 400 && signupErr.response?.data?.detail === "Email already registered") {
            showToast('Email already registered. Please login instead.', 'error');
            setIsLoading(false);
            return;
          }
          throw signupErr;
        }
      }

      const formData = new FormData() as any;
      formData.append('username', email);
      formData.append('password', pin);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await SecureStore.setItemAsync(TOKEN_KEY, response.data.access_token);
      showToast(mode === 'signup' ? 'Account created! Welcome to CircleUp. 🎉' : 'Welcome back! 🎉', 'success');
      router.replace('/(tabs)/vault' as any);
    } catch (error: any) {
      console.error('[Login] Error:', error.message, error.response?.status, error.response?.data);

      if (error.code === 'ECONNABORTED') {
        showToast('Request timed out. Is the backend running?', 'error');
      } else if (error.message?.includes('Network Error') || !error.response) {
        showToast(`Network Error: Cannot reach backend. Check if the server is running.`, 'error');
      } else {
        const detail = error.response?.data?.detail || error.message || 'Unknown error';
        showToast(`Error: ${detail}`, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      style={styles.flex}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { paddingTop: insets.top + SPACING.s, paddingBottom: insets.bottom + SPACING.m }]}>
          <StatusBar style="dark" />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => step === 'pin' ? setStep('email') : router.back()}
            >
              <Ionicons name="arrow-back" size={scale(24)} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Text style={styles.logoCircle}>Circle</Text>
              <Text style={styles.logoUp}>Up</Text>
            </View>
            <View style={{ width: scale(44) }} />
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step === 'email' ? styles.stepDotActive : styles.stepDotDone]} />
            <View style={styles.stepLine} />
            <View style={[styles.stepDot, step === 'pin' ? styles.stepDotActive : { opacity: 0.3, backgroundColor: COLORS.divider }]} />
          </View>

          <View style={styles.content}>
            {step === 'email' ? (
              <Animated.View entering={SlideInRight.duration(400)} exiting={SlideOutLeft.duration(300)} style={styles.stepView}>
                <Text style={styles.title}>{mode === 'login' ? 'Welcome Back' : 'Join CircleUp'}</Text>
                <Text style={styles.subtitle}>
                  {mode === 'login' 
                    ? 'Enter your email to access your vault and neighborhood tools.' 
                    : 'Create an account to start borrowing and lending tools.'}
                </Text>

                {mode === 'signup' && (
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={scale(20)} color={COLORS.grey} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Your Full Name"
                      placeholderTextColor={COLORS.grey}
                      autoCapitalize="words"
                      autoCorrect={false}
                      value={name}
                      onChangeText={setName}
                      returnKeyType="next"
                    />
                  </View>
                )}

                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={scale(20)} color={COLORS.grey} style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="your@email.com"
                    placeholderTextColor={COLORS.grey}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    autoFocus
                    onSubmitEditing={() => isEmailValid && setStep('pin')}
                    returnKeyType="next"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.mainButton, (!isEmailValid || (mode === 'signup' && !name.trim())) && styles.buttonDisabled]}
                  onPress={() => setStep('pin')}
                  disabled={!isEmailValid || (mode === 'signup' && !name.trim())}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={scale(20)} color={COLORS.primary} style={{ marginLeft: SPACING.s }} />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.changeEmail} 
                  onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}
                >
                  <Text style={styles.changeEmailText}>
                    {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <Text style={styles.changeEmailLink}>{mode === 'login' ? 'Sign Up' : 'Log In'}</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View entering={SlideInRight.duration(400)} style={styles.stepView}>
                <Text style={styles.title}>Set Your PIN</Text>
                <Text style={styles.subtitle}>
                  Create or enter a 6-digit PIN for{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>

                <View style={styles.otpRow}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => { otpInputs.current[index] = ref; }}
                      style={[
                        styles.otpBox,
                        { width: pinBoxSize, height: pinBoxSize },
                        digit ? styles.otpBoxFilled : {}
                      ]}
                      keyboardType="number-pad"
                      secureTextEntry
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
                  style={[styles.mainButton, (!isOtpComplete || isLoading) && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={!isOtpComplete || isLoading}
                >
                  <Text style={styles.buttonText}>
                    {isLoading ? 'Verifying...' : 'Verify & Login'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.changeEmail} onPress={() => setStep('email')}>
                  <Text style={styles.changeEmailText}>Wrong email? <Text style={styles.changeEmailLink}>Change it</Text></Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          <Text style={styles.footerText}>
            Your data is encrypted and never shared with third parties.
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.white },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.l,
    backgroundColor: COLORS.white,
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
  logoCircle: { fontSize: normalize(22), fontWeight: '900', color: COLORS.primary },
  logoUp: { fontSize: normalize(22), fontWeight: '900', color: COLORS.accent },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(30),
  },
  stepDot: { width: scale(10), height: scale(10), borderRadius: scale(5) },
  stepDotActive: { backgroundColor: COLORS.accent, width: scale(24), borderRadius: scale(6) },
  stepDotDone: { backgroundColor: COLORS.success },
  stepLine: { width: scale(40), height: 1, backgroundColor: COLORS.divider, marginHorizontal: SPACING.s },
  content: { flex: 1 },
  stepView: { flex: 1 },
  title: {
    fontSize: normalize(32),
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: verticalScale(12),
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: normalize(16),
    color: COLORS.grey,
    lineHeight: normalize(24),
    fontWeight: '600',
    marginBottom: verticalScale(40),
  },
  emailHighlight: { color: COLORS.primary, fontWeight: '900' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGrey,
    borderRadius: BORDER_RADIUS.m,
    paddingHorizontal: SPACING.m,
    height: verticalScale(64),
    marginBottom: verticalScale(24),
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  inputIcon: { marginRight: SPACING.s },
  textInput: {
    flex: 1,
    fontSize: normalize(16),
    fontWeight: '700',
    color: COLORS.primary,
  },
  mainButton: {
    width: '100%',
    height: verticalScale(60),
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.accent,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { fontSize: normalize(16), fontWeight: '900', color: COLORS.primary },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(40),
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
  changeEmail: {
    alignItems: 'center',
    marginTop: SPACING.l,
  },
  changeEmailText: { fontSize: normalize(14), color: COLORS.grey, fontWeight: '600' },
  changeEmailLink: { color: COLORS.primary, fontWeight: '800' },
  footerText: {
    fontSize: normalize(11),
    color: COLORS.grey,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: SPACING.s,
  },
});
