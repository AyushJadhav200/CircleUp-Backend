import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../constants/theme';
import { scale, verticalScale } from '../../constants/responsive';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();

  const showToast = useCallback((msg: string, t: ToastType = 'success') => {
    setMessage(msg);
    setType(t);
    setVisible(true);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: insets.top + verticalScale(10),
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      hideToast();
    }, 3000);
  }, [insets.top]);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  }, []);

  const getIcon = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return 'checkmark-circle';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return COLORS.primary;
      case 'error': return COLORS.error;
      case 'info': return COLORS.grey;
      default: return COLORS.primary;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              transform: [{ translateY }],
              opacity,
              backgroundColor: getBackgroundColor(),
              ...SHADOWS.medium,
            },
          ]}
        >
          <Ionicons name={getIcon() as any} size={scale(20)} color={COLORS.white} />
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: scale(20),
    right: scale(20),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: BORDER_RADIUS.m,
    zIndex: 9999,
  },
  toastText: {
    color: COLORS.white,
    marginLeft: scale(10),
    fontSize: TYPOGRAPHY.body.fontSize,
    fontWeight: '800',
  },
});
