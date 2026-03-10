import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { ShieldIcon } from '../../icons';

export default function AgeConfirmScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);

  function handleContinue() {
    if (confirmed) {
      router.push('/(auth)/phone-otp');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <ShieldIcon size={48} color={colors.gold} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('auth.ageConfirmTitle')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('auth.ageConfirmSubtitle')}
        </Text>

        <Pressable
          style={[
            styles.checkboxRow,
            { borderColor: confirmed ? colors.gold : colors.borderDefault, backgroundColor: colors.bgCard },
          ]}
          onPress={() => setConfirmed(!confirmed)}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: confirmed ? colors.gold : colors.textMuted },
              confirmed && { backgroundColor: colors.gold },
            ]}
          >
            {confirmed && <Text style={[styles.checkmark, { color: colors.bgPrimary }]}>{'✓'}</Text>}
          </View>
          <Text style={[styles.checkboxLabel, { color: colors.textPrimary }]}>
            {t('auth.ageConfirmCheckbox')}
          </Text>
        </Pressable>

        <Text style={[styles.notice, { color: colors.textTertiary }]}>
          {t('auth.ageConfirmNotice')}
        </Text>
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: colors.gold }, !confirmed && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!confirmed}
      >
        <Text style={[styles.buttonText, { color: colors.bgPrimary }]}>{t('common.continue')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...Typography.sectionHeader,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    textAlign: 'center',
    marginBottom: 40,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    ...Typography.body,
    flex: 1,
  },
  notice: {
    ...Typography.caption,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...Typography.cardTitle,
  },
});
