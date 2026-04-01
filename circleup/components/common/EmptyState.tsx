import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../../constants/theme';
import { scale, normalize } from '../../constants/responsive';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  buttonText?: string;
  onPress?: () => void;
}

export function EmptyState({ icon, title, subtitle, buttonText, onPress }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon as any} size={scale(80)} color="#E0E0E0" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonText && onPress && (
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: normalize(20),
    fontWeight: '900',
    color: COLORS.primary,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: normalize(14),
    color: COLORS.grey,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 20,
    fontWeight: '500',
  },
  button: {
    marginTop: 30,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.xl,
  },
  buttonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: normalize(14),
  },
});
