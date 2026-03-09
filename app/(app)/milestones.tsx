import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import { Typography } from '../../constants/typography';
import { getMilestones, type Milestone } from '../../lib/engagement/milestones';
import { getStreak, type StreakData } from '../../lib/engagement/streaks';
import { getCurrentGoals, generateDefaultGoals, type WeeklyGoal } from '../../lib/engagement/goals';
import { useTranslation } from '../../hooks/useTranslation';
import {
  ChevronLeftIcon, CheckIcon, FireIcon, TrophyIcon, ShieldIcon, StarIcon,
} from '../../icons';

type Tab = 'week' | 'milestones';

const MILESTONE_KEYS: Record<string, { label: string; sublabel: string }> = {
  cycle_1: { label: 'milestones.cycle1', sublabel: 'milestones.cycle1Sub' },
  cycle_3: { label: 'milestones.cycle3', sublabel: 'milestones.cycle3Sub' },
  cycle_6: { label: 'milestones.cycle6', sublabel: 'milestones.cycle6Sub' },
  cycle_12: { label: 'milestones.cycle12', sublabel: 'milestones.cycle12Sub' },
  pregnancy: { label: 'milestones.pregnancy', sublabel: 'milestones.pregnancySub' },
};

const BADGE_KEYS = [
  { id: 'streak_3', label: 'milestones.streak3' },
  { id: 'cycle_tracker', label: 'milestones.cycleTracker' },
  { id: 'perfect_month', label: 'milestones.perfectMonth' },
  { id: 'night_owl', label: 'milestones.nightOwl' },
  { id: 'mood_master', label: 'milestones.moodMaster' },
];

export default function MilestonesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { db } = useDatabase();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('week');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0, bestStreak: 0, lastActiveWeek: null, isActiveThisWeek: false,
  });
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);

  const loadData = useCallback(async () => {
    if (!db) return;
    const [m, s, g] = await Promise.all([
      getMilestones(db),
      getStreak(db),
      getCurrentGoals(db),
    ]);
    setMilestones(m);
    setStreak(s);

    if (g.length === 0) {
      await generateDefaultGoals(db);
      setGoals(await getCurrentGoals(db));
    } else {
      setGoals(g);
    }
  }, [db]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon size={20} color={colors.gold} />
          <Text style={[styles.backText, { color: colors.gold }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('milestones.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderColor: colors.borderDefault }]}>
        <Pressable
          style={[styles.tab, activeTab === 'week' && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('week')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'week' ? colors.gold : colors.textTertiary }]}>
            {t('milestones.thisWeek')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'milestones' && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('milestones')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'milestones' ? colors.gold : colors.textTertiary }]}>
            {t('milestones.milestonesTab')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'week' ? (
          <>
            {/* Streak banner */}
            <View style={[styles.streakBanner, { backgroundColor: colors.bgGoldSubtle, borderColor: colors.borderGold }]}>
              <FireIcon size={28} color={colors.gold} />
              <Text style={[styles.streakCount, { color: colors.gold }]}>{streak.currentStreak}</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                {t('milestones.weekStreak')} {streak.isActiveThisWeek ? t('milestones.active') : ''}
              </Text>
              {streak.bestStreak > streak.currentStreak && (
                <Text style={[styles.bestStreak, { color: colors.textTertiary }]}>
                  {t('milestones.bestWeeks', { count: streak.bestStreak })}
                </Text>
              )}
            </View>

            {/* Weekly goals */}
            <Text style={[styles.goalsTitle, { color: colors.textPrimary }]}>{t('milestones.weeklyGoals')}</Text>
            {goals.length > 0 ? (
              goals.map((goal) => (
                <View
                  key={goal.id}
                  style={[styles.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}
                >
                  <View style={styles.goalRow}>
                    <View style={[styles.goalCheck, {
                      backgroundColor: goal.completed ? colors.success : 'transparent',
                      borderColor: goal.completed ? colors.success : colors.borderDefault,
                    }]}>
                      {goal.completed && <CheckIcon size={14} color="#FFFFFF" />}
                    </View>
                    <View style={styles.goalInfo}>
                      <Text style={[
                        styles.goalText,
                        { color: goal.completed ? colors.textTertiary : colors.textPrimary },
                        goal.completed && styles.goalCompleted,
                      ]}>
                        {goal.goalText}
                      </Text>
                      <Text style={[styles.goalProgress, { color: colors.textTertiary }]}>
                        {goal.currentCount}/{goal.targetCount}
                      </Text>
                    </View>
                  </View>
                  {/* Progress bar */}
                  <View style={[styles.goalProgressBar, { backgroundColor: colors.borderDefault }]}>
                    <View style={[
                      styles.goalProgressFill,
                      {
                        backgroundColor: goal.completed ? colors.success : colors.gold,
                        width: `${Math.min(100, (goal.currentCount / goal.targetCount) * 100)}%`,
                      },
                    ]} />
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
                <Text style={[styles.emptyGoalText, { color: colors.textSecondary }]}>
                  {t('milestones.goalsEmpty')}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Milestones timeline */}
            {milestones.map((m, index) => {
              const keys = MILESTONE_KEYS[m.id] ?? { label: m.id, sublabel: '' };
              return (
                <View key={m.id} style={styles.milestoneRow}>
                  <View style={styles.timelineCol}>
                    <View style={[
                      styles.timelineDot,
                      {
                        borderColor: m.unlocked ? colors.gold : colors.borderDefault,
                        backgroundColor: m.unlocked ? colors.gold : 'transparent',
                      },
                    ]}>
                      {m.unlocked && <TrophyIcon size={6} color="#FFFFFF" />}
                    </View>
                    {index < milestones.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: colors.borderDefault }]} />
                    )}
                  </View>
                  <View style={[
                    styles.milestoneCard,
                    {
                      backgroundColor: colors.bgCard,
                      borderColor: m.unlocked ? colors.borderGold : colors.borderDefault,
                      opacity: m.unlocked ? 1 : 0.6,
                    },
                  ]}>
                    <View style={styles.milestoneHeader}>
                      <Text style={[styles.milestoneLabel, { color: colors.textPrimary }]}>{t(keys.label)}</Text>
                      {m.unlocked && (
                        <View style={styles.unlockedRow}>
                          <StarIcon size={12} color={colors.gold} />
                          <Text style={[styles.milestoneUnlocked, { color: colors.gold }]}>{t('milestones.unlocked')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.milestoneSublabel, { color: colors.textSecondary }]}>{t(keys.sublabel)}</Text>
                    {!m.unlocked && m.progress > 0 && (
                      <View style={[styles.milestoneProgressBar, { backgroundColor: colors.borderDefault }]}>
                        <View style={[styles.milestoneProgressFill, {
                          backgroundColor: colors.gold,
                          width: `${Math.round(m.progress * 100)}%`,
                        }]} />
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Badges */}
            <Text style={[styles.badgesTitle, { color: colors.textPrimary }]}>{t('milestones.badges')}</Text>
            <View style={styles.badgesGrid}>
              {BADGE_KEYS.map((b) => {
                const earned = (b.id === 'streak_3' && streak.bestStreak >= 3);
                return (
                  <View
                    key={b.id}
                    style={[
                      styles.badgeCard,
                      {
                        backgroundColor: earned ? colors.bgGoldSubtle : colors.bgCard,
                        borderColor: earned ? colors.borderGold : colors.borderDefault,
                        opacity: earned ? 1 : 0.4,
                      },
                    ]}
                  >
                    <ShieldIcon size={16} color={earned ? colors.gold : colors.textTertiary} />
                    <Text style={[styles.badgeLabel, { color: earned ? colors.gold : colors.textTertiary }]}>
                      {t(b.label)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
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
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 24 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { ...Typography.cardTitle },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  streakBanner: {
    borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 24,
  },
  streakCount: { fontSize: 36, fontFamily: 'PlayfairDisplay-Bold', marginTop: 8 },
  streakLabel: { ...Typography.body, marginTop: 4 },
  bestStreak: { ...Typography.caption, marginTop: 4 },
  goalsTitle: { ...Typography.cardTitle, marginBottom: 12 },
  goalCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 10,
  },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalCheck: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  goalInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalText: { ...Typography.body, flex: 1 },
  goalCompleted: { textDecorationLine: 'line-through' },
  goalProgress: { ...Typography.caption, marginLeft: 8 },
  goalProgressBar: { height: 3, borderRadius: 1.5, marginTop: 12 },
  goalProgressFill: { height: 3, borderRadius: 1.5 },
  emptyGoalText: { ...Typography.body, lineHeight: 22 },
  milestoneRow: { flexDirection: 'row', marginBottom: 0 },
  timelineCol: { width: 32, alignItems: 'center' },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 4,
    justifyContent: 'center', alignItems: 'center',
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  milestoneCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, marginLeft: 8,
  },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneLabel: { ...Typography.cardTitle, marginBottom: 4 },
  milestoneUnlocked: { ...Typography.caption },
  unlockedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  milestoneSublabel: { ...Typography.caption },
  milestoneProgressBar: { height: 3, borderRadius: 1.5, marginTop: 8 },
  milestoneProgressFill: { height: 3, borderRadius: 1.5 },
  badgesTitle: { ...Typography.cardTitle, marginTop: 24, marginBottom: 12 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  badgeLabel: { ...Typography.caption },
});
