import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '../hooks/use-color-scheme';
import { ToastProvider } from '../components/common/ToastProvider';
import { CartProvider } from '../components/common/CartProvider';
import { AnimatedSplashScreen } from '../components/common/AnimatedSplashScreen';
import { registerForPushNotificationsAsync } from '../services/notifications';

// Keep the splash screen visible while we fetch resources or run our custom animation
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isSplashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <CartProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="tool-details" options={{ presentation: 'modal' }} />
            <Stack.Screen name="lend-tool" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="karma" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="messages" options={{ presentation: 'modal' }} />
            <Stack.Screen name="tool-guide" options={{ presentation: 'modal' }} />
            <Stack.Screen name="checkout/index" options={{ presentation: 'modal' }} />
            <Stack.Screen name="checkout/address" options={{ presentation: 'modal' }} />
            <Stack.Screen name="checkout/order-summary" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
            <Stack.Screen name="shop/index" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="shop/[id]" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />

          {/* Animated Splash Screen Overlay */}
          {!isSplashComplete && (
            <AnimatedSplashScreen onAnimationComplete={() => setSplashComplete(true)} />
          )}

          </ThemeProvider>
        </CartProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
