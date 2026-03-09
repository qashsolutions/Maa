import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { DatabaseProvider } from '../contexts/DatabaseContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { getBoolean, StorageKeys } from '../lib/utils/storage';
import {
  registerForPushNotifications,
  setupNotificationResponseListener,
  setupForegroundNotificationListener,
} from '../lib/notifications/fcm-client';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors } = useTheme();
  const { language } = useLanguage();
  const segments = useSegments();
  const router = useRouter();
  const fcmInitialized = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const onboardingComplete = getBoolean(StorageKeys.ONBOARDING_COMPLETE);

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/language-detect');
    } else if (isAuthenticated && onboardingComplete && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [isAuthenticated, isLoading, segments]);

  // Initialize FCM when authenticated
  useEffect(() => {
    if (!isAuthenticated || fcmInitialized.current) return;
    fcmInitialized.current = true;

    const notificationsEnabled = getBoolean(StorageKeys.NOTIFICATIONS_ENABLED);
    if (notificationsEnabled) {
      registerForPushNotifications(language.code).catch((err) =>
        console.warn('FCM registration failed:', err),
      );
    }

    const cleanupResponse = setupNotificationResponseListener();
    const cleanupForeground = setupForegroundNotificationListener();

    return () => {
      cleanupResponse();
      cleanupForeground();
    };
  }, [isAuthenticated, language.code]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgPrimary }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlayfairDisplay-Regular': require('../assets/fonts/PlayfairDisplay-Regular.ttf'),
    'PlayfairDisplay-Light': require('../assets/fonts/PlayfairDisplay-Light.ttf'),
    'PlayfairDisplay-SemiBold': require('../assets/fonts/PlayfairDisplay-SemiBold.ttf'),
    'PlayfairDisplay-Bold': require('../assets/fonts/PlayfairDisplay-Bold.ttf'),
    'DMSans-Light': require('../assets/fonts/DMSans-Light.ttf'),
    'DMSans-Regular': require('../assets/fonts/DMSans-Regular.ttf'),
    'DMSans-Medium': require('../assets/fonts/DMSans-Medium.ttf'),
    'DMSans-SemiBold': require('../assets/fonts/DMSans-SemiBold.ttf'),
    'DMSans-Bold': require('../assets/fonts/DMSans-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <DatabaseProvider>
        <AuthProvider>
          <LanguageProvider>
            <RootNavigator />
          </LanguageProvider>
        </AuthProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
