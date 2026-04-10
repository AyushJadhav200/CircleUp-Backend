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

  // 🚨 PERMANENT FIX for SDK 53+: Android Remote notifications are REMOVED from Expo Go.
  // We must skip registration entirely and silently in Expo Go to avoid the big error banner.
  const isExpoGo = 
    Constants.executionEnvironment === 'storeClient' || 
    Constants.appOwnership === 'expo' || 
    (!Constants.expoConfig && !Constants.manifest);

  if (Platform.OS === 'android' && isExpoGo) {
    // We log a quiet warning instead of calling the crashing SDK functions
    if (__DEV__) {
      console.log('💡 [CircleUp] Push Notifications are disabled in Expo Go. To use them, create a Development Build.');
    }
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
