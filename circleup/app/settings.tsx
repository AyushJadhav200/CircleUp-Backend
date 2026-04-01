import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AdaptiveScreen } from '../components/common/AdaptiveScreen';
import { scale, verticalScale, normalize } from '../constants/responsive';
import { COLORS, SHADOWS, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../constants/theme';
import { useToast } from '../components/common/ToastProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const SettingRow = ({ icon, title, value, onToggle, index }: any) => (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} style={styles.settingRow}>
      <View style={styles.settingLabelGroup}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={scale(20)} color={COLORS.primary} />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onToggle}
        trackColor={{ false: COLORS.divider, true: COLORS.accent }}
        thumbColor={COLORS.white}
      />
    </Animated.View>
  );

  return (
    <AdaptiveScreen style={styles.container} horizontalPadding={0} backgroundColor={COLORS.primary} edgeToEdge={true}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={scale(24)} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <View style={styles.body}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.sectionHeading}>PREFERENCES</Text>
            
            <SettingRow 
              index={1}
              icon="notifications-outline" 
              title="Push Notifications" 
              value={notifications}
              onToggle={(v: boolean) => {
                setNotifications(v);
                showToast(v ? 'Notifications enabled' : 'Notifications disabled', 'info');
              }}
            />
            <SettingRow 
              index={2}
              icon="locate-outline" 
              title="Location Services" 
              value={location}
              onToggle={(v: boolean) => {
                setLocation(v);
              }}
            />
            <SettingRow 
              index={3}
              icon="megaphone-outline" 
              title="Marketing Updates" 
              value={marketing}
              onToggle={setMarketing}
            />

            <Text style={[styles.sectionHeading, { marginTop: verticalScale(32) }]}>ACCOUNT</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Advanced vault security is active.', 'success')}>
                <View style={styles.settingLabelGroup}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="shield-checkmark-outline" size={scale(20)} color={COLORS.primary} />
                    </View>
                    <Text style={styles.settingTitle}>Privacy & Security</Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={COLORS.divider} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => showToast('Support: help@circleup.local', 'info')}>
                <View style={styles.settingLabelGroup}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="help-buoy-outline" size={scale(20)} color={COLORS.primary} />
                    </View>
                    <Text style={styles.settingTitle}>Help Center</Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={COLORS.divider} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/tool-guide' as any)}>
                <View style={styles.settingLabelGroup}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="book-outline" size={scale(20)} color={COLORS.primary} />
                    </View>
                    <Text style={styles.settingTitle}>User Guide</Text>
                </View>
                <Ionicons name="chevron-forward" size={scale(18)} color={COLORS.divider} />
            </TouchableOpacity>

            <View style={styles.dangerZone}>
                <TouchableOpacity 
                    style={styles.deleteBtn} 
                    onPress={() => {
                        import('react-native').then(({ Alert }) => {
                            Alert.alert(
                                "Delete Account",
                                "Are you sure? This will permanently erase your tools, karma, and neighborhood history.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Delete", style: "destructive", onPress: () => showToast('Feature disabled for demo', 'error') }
                                ]
                            );
                        });
                    }}
                >
                    <Text style={styles.deleteText}>Delete Account</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(20),
    backgroundColor: COLORS.primary,
  },
  backBtn: { padding: scale(5) },
  headerTitle: { fontSize: normalize(20), fontWeight: '900', color: COLORS.white },
  body: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.l,
    paddingTop: verticalScale(30),
  },
  sectionHeading: { fontSize: normalize(11), fontWeight: '900', color: COLORS.divider, letterSpacing: 1.5, marginBottom: verticalScale(16) },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrey,
  },
  settingLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: {
      width: scale(36),
      height: scale(36),
      borderRadius: 18,
      backgroundColor: COLORS.lightGrey,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: SPACING.m,
  },
  settingTitle: { fontSize: normalize(15), fontWeight: '700', color: COLORS.primary },
  dangerZone: { marginTop: verticalScale(40), borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: verticalScale(20) },
  deleteBtn: {
      height: verticalScale(54),
      borderRadius: BORDER_RADIUS.m,
      backgroundColor: 'rgba(255, 59, 48, 0.05)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  deleteText: { fontSize: normalize(14), fontWeight: '800', color: COLORS.error },
});
