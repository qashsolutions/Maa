import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import { Typography } from '../../constants/typography';
import { calculateLocalScore, saveScoreSnapshot, type MaaScore } from '../../lib/engagement/score';
import { useTranslation } from '../../hooks/useTranslation';
import { ChevronLeftIcon, HeartIcon, BrainIcon, LeafIcon, StarIcon } from '../../icons';

const PILLAR_ICONS: Record<string, (props: { size: number; color: string }) => React.ReactNode> = {
  cycle: ({ size, color }) => <HeartIcon size={size} color={color} />,
  mood: ({ size, color }) => <BrainIcon size={size} color={color} />,
  body: ({ size, color }) => <LeafIcon size={size} color={color} />,
  consistency: ({ size, color }) => <StarIcon size={size} color={color} />,
};

export default function ScoreScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { db } = useDatabase();
  const { t } = useTranslation();
  const [score, setScore] = useState<MaaScore>({
    total: 0, cycleIntelligence: 0, moodMap: 0, bodyAwareness: 0, consistency: 0,
  });

  const [weeklyChange, setWeeklyChange] = useState<number>(0);

  const loadScore = useCallback(async () => {
    if (!db) return;
    const calculated = await calculateLocalScore(db);
    setScore(calculated);
    await saveScoreSnapshot(db, calculated);

    // Calculate weekly change from last snapshot
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevRow = await db.getFirstAsync<{ total_score: number }>(
      `SELECT total_score FROM score_snapshots WHERE snapshot_date <= ? ORDER BY snapshot_date DESC LIMIT 1`,
      [sevenDaysAgo],
    );
    if (prevRow) {
      setWeeklyChange(calculated.total - prevRow.total_score);
    }
  }, [db]);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  const pillarData = useMemo(() => [
    { key: 'cycle', label: t('score.cycleIntelligence'), score: score.cycleIntelligence, color: '#C4556E' },
    { key: 'mood', label: t('score.moodMap'), score: score.moodMap, color: '#7B68EE' },
    { key: 'body', label: t('score.bodyAwareness'), score: score.bodyAwareness, color: '#3CB371' },
    { key: 'consistency', label: t('score.consistency'), score: score.consistency, color: '#DAA520' },
  ], [score, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon size={20} color={colors.gold} />
          <Text style={[styles.backText, { color: colors.gold }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('score.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Score ring */}
        <AnimatedScoreRing score={score.total} colors={colors} />

        {weeklyChange !== 0 ? (
          <Text style={[styles.weeklyChange, { color: weeklyChange > 0 ? colors.gold : colors.textTertiary }]}>
            {weeklyChange > 0 ? t('score.changeThisWeek', { change: weeklyChange }) : `${weeklyChange} this week`}
          </Text>
        ) : (
          <Text style={[styles.weeklyChange, { color: colors.textTertiary }]}>
            {t('score.noChange')}
          </Text>
        )}

        <Text style={[styles.motivation, { color: colors.textSecondary }]}>
          {score.total === 0
            ? t('score.motivationZero')
            : score.total < 30
              ? t('score.motivationLow')
              : score.total < 60
                ? t('score.motivationMid')
                : t('score.motivationHigh')}
        </Text>

        {/* Pillar cards */}
        <View style={styles.pillars}>
          {pillarData.map((p) => (
            <PillarCard
              key={p.key}
              icon={PILLAR_ICONS[p.key]}
              label={p.label}
              score={p.score}
              max={25}
              color={p.color}
              colors={colors}
            />
          ))}
        </View>

        {/* Next unlock teaser */}
        {score.total < 100 && (
          <View style={[styles.nextUnlock, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
            <Text style={[styles.nextUnlockTitle, { color: colors.textPrimary }]}>
              {t('score.nextUnlock')}
            </Text>
            <Text style={[styles.nextUnlockText, { color: colors.textSecondary }]}>
              {getNextUnlockText(score, t)}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AnimatedScoreRing({ score, colors }: { score: number; colors: Record<string, string> }) {
  const animatedScore = useSharedValue(0);

  useEffect(() => {
    animatedScore.value = withTiming(score, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [score, animatedScore]);

  const ringStyle = useAnimatedStyle(() => {
    const progress = animatedScore.value / 100;
    return {
      borderColor: colors.gold,
      borderWidth: 6,
      borderRightColor: progress > 0.25 ? colors.gold : colors.borderDefault,
      borderBottomColor: progress > 0.5 ? colors.gold : colors.borderDefault,
      borderLeftColor: progress > 0.75 ? colors.gold : colors.borderDefault,
    };
  });

  return (
    <Animated.View style={[styles.scoreRing, ringStyle]}>
      <CountUpText value={score} style={[styles.scoreNumber, { color: colors.gold }]} />
      <Text style={[styles.scoreLabel, { color: colors.textTertiary }]}>/ 100</Text>
    </Animated.View>
  );
}

function CountUpText({ value, style }: { value: number; style: any }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return <Text style={style}>{display}</Text>;
}

const PillarCard = React.memo(function PillarCard({
  icon, label, score, max, color, colors,
}: {
  icon: (props: { size: number; color: string }) => React.ReactNode;
  label: string; score: number; max: number; color: string; colors: Record<string, string>;
}) {
  const fillWidth = max > 0 ? `${(score / max) * 100}%` as const : '0%' as const;

  return (
    <View style={[styles.pillarCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
      <View style={styles.pillarIconRow}>
        {icon({ size: 18, color })}
      </View>
      <View style={styles.pillarInfo}>
        <Text style={[styles.pillarLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.pillarScore, { color: colors.textSecondary }]}>
          {score}/{max}
        </Text>
      </View>
      <View style={[styles.progressBar, { backgroundColor: colors.borderDefault }]}>
        <View style={[styles.progressFill, { width: fillWidth, backgroundColor: color }]} />
      </View>
    </View>
  );
});

function getNextUnlockText(score: MaaScore, t: (key: string) => string): string {
  if (score.cycleIntelligence < 12) return t('score.unlockCycle');
  if (score.moodMap < 12) return t('score.unlockMood');
  if (score.bodyAwareness < 12) return t('score.unlockBody');
  if (score.consistency < 12) return t('score.unlockConsistency');
  return t('score.unlockKeepGoing');
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
  scoreRing: {
    width: 160, height: 160, borderRadius: 80,
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginVertical: 32,
  },
  scoreNumber: { ...Typography.hero, fontSize: 48 },
  scoreLabel: { ...Typography.caption },
  weeklyChange: { ...Typography.bodyMedium, textAlign: 'center', marginBottom: 8 },
  motivation: {
    ...Typography.body, textAlign: 'center', marginBottom: 32, paddingHorizontal: 16,
  },
  pillars: { gap: 12 },
  pillarCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  pillarIconRow: { marginBottom: 8 },
  pillarInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  pillarLabel: { ...Typography.cardTitle },
  pillarScore: { ...Typography.caption },
  progressBar: { height: 4, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  nextUnlock: {
    borderRadius: 16, borderWidth: 1, padding: 20, marginTop: 24,
  },
  nextUnlockTitle: { ...Typography.cardTitle, marginBottom: 4 },
  nextUnlockText: { ...Typography.body, lineHeight: 22 },
});
