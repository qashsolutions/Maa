import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { ChevronLeftIcon, ShieldCheckIcon } from '../../icons';

const SECTIONS = [
  {
    title: 'Data Collection',
    body: 'Maa collects only the health information you voluntarily share through voice conversations. We do not collect your name, email, age, or any personally identifiable information beyond your phone number for authentication.',
  },
  {
    title: 'Data Storage',
    body: 'All your health data is stored locally on your device using encrypted storage. Only anonymized health summaries (without any personal identifiers) are synced to the cloud for generating insights and weekly summaries.',
  },
  {
    title: 'No Analytics or Tracking',
    body: 'Maa does not use any analytics, advertising trackers, or third-party data collection services. We do not track your location after initial language detection, and we do not collect device identifiers for advertising.',
  },
  {
    title: 'Voice Data',
    body: 'Voice recordings are processed in real-time for speech-to-text conversion and are never stored on our servers. Only the transcribed text is sent to our AI engine for generating responses, and conversation logs are stored locally on your device.',
  },
  {
    title: 'Data Sharing',
    body: 'We never sell, share, or provide your health data to third parties. Anonymized, aggregated data may be used to improve the AI model, but it can never be traced back to you.',
  },
  {
    title: 'Your Rights',
    body: 'You can export all your data at any time from Settings. You can also permanently delete all your data (local and cloud) from Settings > Delete My Data. This action is irreversible.',
  },
  {
    title: 'Encryption',
    body: 'All data transmitted between your device and our servers is encrypted using TLS. Local storage uses encrypted databases to protect your information even if your device is compromised.',
  },
  {
    title: 'Contact',
    body: 'For privacy concerns or data requests, contact us at privacy@maahealth.com.',
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

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

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <ShieldCheckIcon size={48} color={colors.gold} />
        </View>
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>
          Last updated: March 2026
        </Text>

        {SECTIONS.map((section, i) => (
          <View key={i} style={[styles.section, { borderColor: colors.borderDefault }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.textSecondary }]}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
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
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  iconContainer: { alignItems: 'center', marginVertical: 24 },
  lastUpdated: { ...Typography.caption, textAlign: 'center', marginBottom: 24 },
  section: { borderBottomWidth: 1, paddingVertical: 20 },
  sectionTitle: { ...Typography.cardTitle, marginBottom: 8 },
  sectionBody: { ...Typography.body, lineHeight: 22 },
});
