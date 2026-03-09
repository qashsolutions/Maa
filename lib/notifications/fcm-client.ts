/**
 * FCM client-side setup for push notifications.
 * Registers for push tokens, handles foreground/background notifications,
 * and routes notification taps to the correct screen.
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { setString, StorageKeys } from '../utils/storage';
import { syncProfile } from '../sync/sync-engine';

/** Configure notification behavior */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Register for push notifications and save FCM token */
export async function registerForPushNotifications(languageCode: string): Promise<string | null> {
  // Check permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return null;
  }

  // Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Maa Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#DAA520',
    });
  }

  // Get push token
  const tokenResult = await Notifications.getExpoPushTokenAsync({
    projectId: 'maahealth-d19cf',
  });
  const token = tokenResult.data;

  // Save locally and sync to Firestore
  setString(StorageKeys.FCM_TOKEN, token);
  await syncProfile(languageCode, token);

  return token;
}

/** Set up notification response listener (when user taps a notification) */
export function setupNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;

    // Route to appropriate screen based on notification type
    switch (data?.screen) {
      case 'summary':
        router.push('/(app)/summary');
        break;
      case 'milestones':
        router.push('/(app)/milestones');
        break;
      case 'score':
        router.push('/(app)/score');
        break;
      case 'home':
      default:
        router.push('/(app)');
        break;
    }
  });

  return () => subscription.remove();
}

/** Set up foreground notification listener */
export function setupForegroundNotificationListener(): () => void {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    // Foreground notifications are shown automatically by the handler above
    console.log('Foreground notification:', notification.request.content.title);
  });

  return () => subscription.remove();
}
