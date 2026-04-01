import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, normalize } from '../../constants/responsive';
import { COLORS, SHADOWS } from '../../constants/theme';

const TAB_ICON_SIZE = scale(22);
const ACTIVE_CONTAINER_SIZE = scale(38);

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const tabBarHeight = Platform.OS === 'ios'
    ? 65 + insets.bottom
    : 70;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.grey,
        headerShown: false,
        tabBarStyle: {
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 10,
          paddingTop: 8,
          backgroundColor: COLORS.white,
          borderTopWidth: 0,
          ...SHADOWS.medium,
        },
        tabBarLabelStyle: {
          fontSize: normalize(10),
          fontWeight: '800',
          letterSpacing: 0.2,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBox, focused && styles.activeIconBox]}>
              <Ionicons
                name={focused ? 'briefcase' : 'briefcase-outline'}
                size={TAB_ICON_SIZE}
                color={focused ? COLORS.white : COLORS.grey}
              />
            </View>
          ),
          tabBarActiveTintColor: COLORS.primary,
        }}
      />
      <Tabs.Screen
        name="radar"
        options={{
          title: 'Radar',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBox, focused && styles.activeIconBox]}>
              <Ionicons
                name={focused ? 'compass' : 'compass-outline'}
                size={TAB_ICON_SIZE}
                color={focused ? COLORS.white : COLORS.grey}
              />
            </View>
          ),
          tabBarActiveTintColor: COLORS.primary,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBox, focused && styles.activeIconBox]}>
              <Ionicons
                name={focused ? 'time' : 'time-outline'}
                size={TAB_ICON_SIZE}
                color={focused ? COLORS.white : COLORS.grey}
              />
            </View>
          ),
          tabBarActiveTintColor: COLORS.primary,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconBox, focused && styles.activeIconBox]}>
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={TAB_ICON_SIZE}
                color={focused ? COLORS.white : COLORS.grey}
              />
            </View>
          ),
          tabBarActiveTintColor: COLORS.primary,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    width: ACTIVE_CONTAINER_SIZE,
    height: ACTIVE_CONTAINER_SIZE,
    borderRadius: ACTIVE_CONTAINER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconBox: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
