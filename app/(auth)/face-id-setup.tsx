import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { setBoolean, StorageKeys } from '../../lib/utils/storage';

export default function FaceIdSetupScreen() {
  const router = useRouter();

  async function handleEnable() {
    // TODO: Trigger expo-local-authentication enrollment
    setBoolean(StorageKeys.BIOMETRIC_ENABLED, true);
    completeOnboarding();
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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.lockIcon}>*</Text>
          </View>
        </View>

        <Text style={styles.title}>Protect your privacy</Text>
        <Text style={styles.subtitle}>
          Your health data is personal. Enable biometric lock so only you can
          access the app.
        </Text>

        <View style={styles.badges}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>End-to-end encrypted</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Biometric lock</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.button} onPress={handleEnable}>
          <Text style={styles.buttonText}>Enable Biometric Lock</Text>
        </Pressable>
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Maybe later</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
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
    backgroundColor: Colors.bgGoldSubtle,
    borderWidth: 2,
    borderColor: Colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 40,
    color: Colors.gold,
  },
  title: {
    ...Typography.sectionHeader,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  button: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    ...Typography.cardTitle,
    color: Colors.bgPrimary,
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipText: {
    ...Typography.bodyMedium,
    color: Colors.textTertiary,
  },
});
