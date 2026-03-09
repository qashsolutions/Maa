import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { ChevronLeftIcon } from '../../icons';

/**
 * Privacy Policy URL — hosted externally so updates don't require app releases.
 * Configure via EXPO_PUBLIC_PRIVACY_POLICY_URL env var.
 * Falls back to GitHub Pages URL.
 */
const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ??
  'https://qashsolutions.github.io/Maa/privacy-policy.html';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon size={20} color={colors.gold} />
          <Text style={[styles.backText, { color: colors.gold }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.privacyPolicy')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            {t('errors.offline')}
          </Text>
          <Pressable
            style={[styles.retryBtn, { borderColor: colors.gold }]}
            onPress={() => { setError(false); setLoading(true); }}
          >
            <Text style={[styles.retryText, { color: colors.gold }]}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.gold} />
            </View>
          )}
          <WebView
            source={{ uri: PRIVACY_POLICY_URL }}
            style={[styles.webview, { backgroundColor: colors.bgPrimary }]}
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setError(true); }}
            onHttpError={() => { setLoading(false); setError(true); }}
            startInLoadingState={false}
            javaScriptEnabled={false}
            domStorageEnabled={false}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { ...Typography.bodyMedium },
  title: { ...Typography.sectionHeader },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32,
  },
  errorText: { ...Typography.body, textAlign: 'center' },
  retryBtn: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
  },
  retryText: { ...Typography.bodyMedium },
});
