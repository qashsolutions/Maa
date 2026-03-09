import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useWeeklySummary } from '../../hooks/useWeeklySummary';
import { useTranslation } from '../../hooks/useTranslation';

const DOMAIN_COLORS: Record<string, string> = {
  mood: '#7B68EE',
  sleep: '#6BA3D6',
  cycle: '#C4556E',
  energy: '#3CB371',
  score: '#DAA520',
};

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const {
    summary,
    isLoading,
    isPlaying,
    playbackProgress,
    playbackDuration,
    playbackPosition,
    error,
    play,
    pause,
    refresh,
  } = useWeeklySummary();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backText, { color: colors.gold }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('summary.title')}</Text>
        <Pressable onPress={refresh} hitSlop={12}>
          <Text style={[styles.backText, { color: colors.gold }]}>
            {isLoading ? '...' : t('common.refresh')}
          </Text>
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: colors.bgGoldSubtle, borderColor: colors.borderGold }]}>
          <Text style={[styles.badgeText, { color: colors.gold }]}>{t('summary.badge')}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.gold} />
            <Text style={[styles.loadingText, { color: colors.textTertiary }]}>
              {t('summary.loadingSummary')}
            </Text>
          </View>
        ) : summary ? (
          <>
            {/* Date range */}
            {summary.weekOf && (
              <Text style={[styles.dateRange, { color: colors.textTertiary }]}>
                {t('summary.weekOf', { date: formatWeekDate(summary.weekOf) })}
              </Text>
            )}

            {/* Audio player */}
            {summary.audioUrl ? (
              <View style={[styles.playerCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
                <Pressable
                  style={[styles.playButton, { backgroundColor: colors.gold }]}
                  onPress={isPlaying ? pause : play}
                >
                  <Text style={[styles.playIcon, { color: colors.bgPrimary }]}>
                    {isPlaying ? 'II' : '>'}
                  </Text>
                </Pressable>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerDuration, { color: colors.textSecondary }]}>
                    {playbackPosition} / {playbackDuration || '0:00'}
                  </Text>
                  <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { backgroundColor: colors.gold, width: `${Math.round(playbackProgress * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.playerCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
                <View style={[styles.playButton, { backgroundColor: colors.borderDefault }]}>
                  <Text style={[styles.playIcon, { color: colors.textMuted }]}>--</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={[styles.playerDuration, { color: colors.textTertiary }]}>
                    {t('summary.audioUnavailable')}
                  </Text>
                </View>
              </View>
            )}

            {/* Summary text */}
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
              {summary.summaryText}
            </Text>

            {/* Insight cards */}
            {summary.insights.length > 0 && (
              <View style={styles.insightsContainer}>
                <Text style={[styles.insightsTitle, { color: colors.textPrimary }]}>
                  {t('summary.insights')}
                </Text>
                {summary.insights.map((insight, index) => {
                  const domainColor = DOMAIN_COLORS[insight.domain] ?? colors.gold;
                  return (
                    <View
                      key={index}
                      style={[styles.insightCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}
                    >
                      <View style={[styles.insightDot, { backgroundColor: domainColor }]} />
                      <View style={styles.insightContent}>
                        <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
                          {insight.title}
                        </Text>
                        <Text style={[styles.insightDetail, { color: colors.textSecondary }]}>
                          {insight.detail}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          /* Empty state */
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { borderColor: colors.borderGold }]}>
              <Text style={{ color: colors.gold, fontSize: 32 }}>*</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {t('summary.noSummaryTitle')}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              {t('summary.noSummaryText')}
            </Text>
          </View>
        )}

        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatWeekDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backText: {
    ...Typography.bodyMedium,
  },
  title: {
    ...Typography.sectionHeader,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeText: {
    ...Typography.label,
  },
  dateRange: {
    ...Typography.caption,
    marginBottom: 24,
  },
  playerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 18,
    fontFamily: 'DMSans-Bold',
  },
  playerInfo: {
    flex: 1,
    gap: 8,
  },
  playerDuration: {
    ...Typography.caption,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  summaryText: {
    ...Typography.body,
    lineHeight: 24,
    marginBottom: 32,
  },
  insightsContainer: {
    gap: 12,
  },
  insightsTitle: {
    ...Typography.cardTitle,
    marginBottom: 4,
  },
  insightCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  insightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  insightContent: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    ...Typography.cardTitle,
  },
  insightDetail: {
    ...Typography.body,
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
  },
  loadingText: {
    ...Typography.body,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    ...Typography.cardTitle,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  errorText: {
    ...Typography.caption,
    textAlign: 'center',
    marginTop: 16,
  },
});
