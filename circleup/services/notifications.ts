import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  // Remote notifications are no longer supported in Expo Go for Android SDK 53+
  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  if (Platform.OS === 'android' && isExpoGo) {
    console.log('[CircleUp] Skipping push registration in Expo Go (Android)');
    return null;
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Getting the projectId from app config, or using a fallback text for development
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? "00000000-0000-0000-0000-000000000000";
      
    try {
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
      console.log('Got Push Token: ', token);

      // Save token to backend
      await api.post('/auth/push-token', { push_token: token });

    } catch (e) {
      console.log("Error getting push token. Make sure EAS is configured.", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
