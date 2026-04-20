import React, { PropsWithChildren, forwardRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ViewStyle, 
  ScrollView, 
  Platform, 
  KeyboardAvoidingView, 
  StatusBar as RNStatusBar 
} from 'react-native';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';
import { scale } from '../../constants/responsive';

interface AdaptiveScreenProps {
  children?: React.ReactNode;
  /** Optional style for the root container */
  style?: ViewStyle;
  /** Optional style for the inner content container (ScrollView or View) */
  contentContainerStyle?: ViewStyle;
  /** Whether the screen should be scrollable. Default: true */
  scrollable?: boolean;
  /** Root background color. Default: #FFFFFF */
  backgroundColor?: string;
  /** Horizontal padding for the content. Default: 24 */
  horizontalPadding?: number;
  /** Whether to handle safe area insets at the root level. Default: true */
  useSafeArea?: boolean;
  /** If true, background extends behind status bar. Default: false */
  edgeToEdge?: boolean;
  /** If true, wraps children in KeyboardAvoidingView. Default: true */
  keyboardAvoiding?: boolean;
}

/**
 * PRODUCTION-GRADE foundation for all CircleUp screens.
 * Handles notches, keyboard safety, and responsive padding with "One Logic for All" consistency.
 */
export const AdaptiveScreen = forwardRef<ScrollView | View, PropsWithChildren<AdaptiveScreenProps>>(({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
  backgroundColor = '#FFFFFF',
  horizontalPadding = 24,
  useSafeArea = true,
  edgeToEdge = false,
  keyboardAvoiding = true,
}, ref) => {
  const insets = useSafeAreaInsets();
  const paddingH = scale(horizontalPadding);

  // 1. Root Container Style (The absolute base)
  const rootStyle: ViewStyle = {
    flex: 1,
    backgroundColor,
    // If edgeToEdge is false, we push the content down to avoid the status bar
    paddingTop: edgeToEdge ? 0 : (useSafeArea ? insets.top : 0),
    paddingBottom: useSafeArea ? insets.bottom : 0,
  };

  // 2. Inner Content Style
  const innerStyle: ViewStyle = {
    flexGrow: 1,
    paddingHorizontal: paddingH,
    ...style,
  };

  // 3. Render Logic
  const renderContent = () => {
    if (scrollable) {
      return (
        <ScrollView
          ref={ref as React.RefObject<ScrollView>}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            { paddingBottom: Platform.OS === 'ios' ? 20 : 40 },
            contentContainerStyle,
            innerStyle,
          ]}
        >
          {children}
        </ScrollView>
      );
    }
    return (
      <View 
        ref={ref as React.RefObject<View>}
        style={[innerStyle, contentContainerStyle]}
      >
        {children}
      </View>
    );
  };

  if (keyboardAvoiding) {
    return (
      <View style={rootStyle}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={{ flex: 1 }}
        >
          {renderContent()}
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={rootStyle}>
      {renderContent()}
    </View>
  );
});

const styles = StyleSheet.create({});
