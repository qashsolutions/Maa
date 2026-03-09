import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { ChevronLeftIcon, StarIcon, CheckIcon } from '../../icons';

const TRIAL_DURATION_DAYS = 180; // 6 months free

export default function SubscriptionScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [daysRemaining, setDaysRemaining] = useState<number>(TRIAL_DURATION_DAYS);

  useEffect(() => {
    // In production, fetch createdAt from Firestore user doc
    // For now, simulate full trial remaining
    setDaysRemaining(TRIAL_DURATION_DAYS);
  }, []);

  const trialActive = daysRemaining > 0;
  const progressWidth = `${Math.max(0, (daysRemaining / TRIAL_DURATION_DAYS) * 100)}%` as const;

  const features = [
    t('subscription.unlimitedVoice'),
    t('subscription.weeklyInsights'),
    t('subscription.predictiveAnalysis'),
    t('subscription.multiLanguage'),
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon size={20} color={colors.gold} />
          <Text style={[styles.backText, { color: colors.gold }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('subscription.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current Plan Card */}
        <View style={[styles.planCard, { backgroundColor: colors.bgCard, borderColor: colors.borderGold }]}>
          <StarIcon size={32} color={colors.gold} />
          <Text style={[styles.planName, { color: colors.gold }]}>
            {t('subscription.freeTrial')}
          </Text>
          <Text style={[styles.planStatus, { color: colors.textSecondary }]}>
            {trialActive
              ? t('subscription.trialEndsIn', { days: daysRemaining })
              : t('subscription.trialExpired')}
          </Text>

          {/* Trial progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
            <View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.gold }]} />
          </View>

          <Text style={[styles.daysCount, { color: colors.textTertiary }]}>
            {daysRemaining} / {TRIAL_DURATION_DAYS}
          </Text>
        </View>

        {/* Pricing (after trial) */}
        <View style={[styles.priceCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <Text style={[styles.priceLabel, { color: colors.textTertiary }]}>
            {t('subscription.currentPlan')}
          </Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceAmount, { color: colors.textPrimary }]}>
              &#x20B9;170
            </Text>
            <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
              {t('subscription.perMonth')}
            </Text>
          </View>
        </View>

        {/* Features */}
        <Text style={[styles.featuresLabel, { color: colors.textTertiary }]}>
          {t('subscription.features')}
        </Text>
        <View style={[styles.featuresCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          {features.map((feature, i) => (
            <View key={i} style={[styles.featureRow, { borderBottomColor: colors.borderSubtle }]}>
              <CheckIcon size={16} color={colors.gold} />
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Manage button (stubbed) */}
        <Pressable
          style={[styles.manageBtn, { backgroundColor: colors.gold }]}
          onPress={() => {
            // Payment integration stub
          }}
        >
          <Text style={[styles.manageBtnText, { color: colors.bgPrimary }]}>
            {t('subscription.managePlan')}
          </Text>
        </Pressable>
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
  planCard: {
    borderRadius: 16, borderWidth: 1.5, padding: 24, alignItems: 'center', marginTop: 16, gap: 8,
  },
  planName: { ...Typography.sectionHeader, marginTop: 8 },
  planStatus: { ...Typography.body },
  progressTrack: { width: '100%', height: 6, borderRadius: 3, marginTop: 12 },
  progressFill: { height: 6, borderRadius: 3 },
  daysCount: { ...Typography.caption, marginTop: 4 },
  priceCard: {
    borderRadius: 16, borderWidth: 1, padding: 20, marginTop: 24,
  },
  priceLabel: { ...Typography.label, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceAmount: { fontSize: 36, fontFamily: 'PlayfairDisplay-Bold' },
  pricePeriod: { ...Typography.body },
  featuresLabel: { ...Typography.label, marginTop: 24, marginBottom: 8 },
  featuresCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1,
  },
  featureText: { ...Typography.body, flex: 1 },
  manageBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 32,
  },
  manageBtnText: { ...Typography.cardTitle },
});
