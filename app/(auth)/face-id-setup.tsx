import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { setBoolean, StorageKeys } from '../../lib/utils/storage';
import {
  isBiometricAvailable,
  getBiometricType,
  authenticateWithBiometric,
} from '../../lib/auth/biometric';
import { useTranslation } from '../../hooks/useTranslation';

export default function FaceIdSetupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [biometricType, setBiometricType] = useState('Biometric');
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    async function check() {
      const isAvailable = await isBiometricAvailable();
      setAvailable(isAvailable);
      if (isAvailable) {
        const type = await getBiometricType();
        setBiometricType(type);
      }
    }
    check();
  }, []);

  async function handleEnable() {
    const success = await authenticateWithBiometric();
    if (success) {
      setBoolean(StorageKeys.BIOMETRIC_ENABLED, true);
      completeOnboarding();
    }
  }

  function handleSkip() {
    setBoolean(StorageKeys.BIOMETRIC_ENABLED, false);
    completeOnboarding();
  }

  function completeOnboarding() {
    setBoolean(StorageKeys.ONBOARDING_COMPLETE, true);
    router.replace('/(app)');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.bgGoldSubtle, borderColor: colors.borderGold }]}>
            <Text style={[styles.lockIcon, { color: colors.gold }]}>*</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.protectPrivacy')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {available
            ? t('auth.biometricAvailable', { type: biometricType })
            : t('auth.biometricUnavailable')}
        </Text>

        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{t('auth.encrypted')}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{t('auth.biometricLock', { type: biometricType })}</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {available && (
          <Pressable style={[styles.button, { backgroundColor: colors.gold }]} onPress={handleEnable}>
            <Text style={[styles.buttonText, { color: colors.bgPrimary }]}>
              {t('auth.enableBiometric', { type: biometricType })}
            </Text>
          </Pressable>
        )}
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textTertiary }]}>
            {available ? t('auth.maybeLater') : t('common.continue')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 40,
  },
  title: {
    ...Typography.sectionHeader,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  badges: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  badgeText: {
    ...Typography.caption,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    ...Typography.cardTitle,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    ...Typography.bodyMedium,
  },
});
