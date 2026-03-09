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

type Tab = 'week' | 'milestones';

const MILESTONE_META: Record<string, { label: string; sublabel: string }> = {
  cycle_1: { label: 'First Cycle', sublabel: 'Basic period prediction unlocked' },
  cycle_3: { label: 'Pattern Finder', sublabel: 'Cross-cycle trend detection unlocked' },
  cycle_6: { label: 'Mood Oracle', sublabel: 'Mood-cycle correlation + PMS prediction unlocked' },
  cycle_12: { label: 'Body Whisperer', sublabel: 'Full annual rhythm map unlocked' },
  pregnancy: { label: 'Pregnancy Guide', sublabel: 'Trimester-aware mode activated' },
};

const BADGES = [
  { id: 'streak_3', label: '3-Week Streak' },
  { id: 'cycle_tracker', label: 'Cycle Tracker' },
  { id: 'perfect_month', label: 'Perfect Month' },
  { id: 'night_owl', label: 'Night Owl' },
  { id: 'mood_master', label: 'Mood Master' },
];

export default function MilestonesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { db } = useDatabase();
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
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backText, { color: colors.gold }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderColor: colors.borderDefault }]}>
        <Pressable
          style={[styles.tab, activeTab === 'week' && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('week')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'week' ? colors.gold : colors.textTertiary }]}>
            This Week
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'milestones' && { borderBottomColor: colors.gold, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('milestones')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'milestones' ? colors.gold : colors.textTertiary }]}>
            Milestones
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'week' ? (
          <>
            {/* Streak banner */}
            <View style={[styles.streakBanner, { backgroundColor: colors.bgGoldSubtle, borderColor: colors.borderGold }]}>
              <Text style={[styles.streakCount, { color: colors.gold }]}>{streak.currentStreak}</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                week streak {streak.isActiveThisWeek ? '(active)' : ''}
              </Text>
              {streak.bestStreak > streak.currentStreak && (
                <Text style={[styles.bestStreak, { color: colors.textTertiary }]}>
                  Best: {streak.bestStreak} weeks
                </Text>
              )}
            </View>

            {/* Weekly goals */}
            <Text style={[styles.goalsTitle, { color: colors.textPrimary }]}>Weekly Goals</Text>
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
                      {goal.completed && <Text style={{ color: '#FFF', fontSize: 12 }}>OK</Text>}
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
                  Your weekly goals will appear here once you start using Maa.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Milestones timeline */}
            {milestones.map((m, index) => {
              const meta = MILESTONE_META[m.id] ?? { label: m.id, sublabel: '' };
              return (
                <View key={m.id} style={styles.milestoneRow}>
                  <View style={styles.timelineCol}>
                    <View style={[
                      styles.timelineDot,
                      {
                        borderColor: m.unlocked ? colors.gold : colors.borderDefault,
                        backgroundColor: m.unlocked ? colors.gold : 'transparent',
                      },
                    ]} />
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
                      <Text style={[styles.milestoneLabel, { color: colors.textPrimary }]}>{meta.label}</Text>
                      {m.unlocked && (
                        <Text style={[styles.milestoneUnlocked, { color: colors.gold }]}>Unlocked</Text>
                      )}
                    </View>
                    <Text style={[styles.milestoneSublabel, { color: colors.textSecondary }]}>{meta.sublabel}</Text>
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
            <Text style={[styles.badgesTitle, { color: colors.textPrimary }]}>Badges</Text>
            <View style={styles.badgesGrid}>
              {BADGES.map((b) => {
                // Badge earned logic based on streak
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
                    <Text style={[styles.badgeLabel, { color: earned ? colors.gold : colors.textTertiary }]}>
                      {b.label}
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
  backText: { ...Typography.bodyMedium },
  title: { ...Typography.sectionHeader },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginHorizontal: 24 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { ...Typography.cardTitle },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },
  streakBanner: {
    borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 24,
  },
  streakCount: { fontSize: 36, fontFamily: 'PlayfairDisplay-Bold' },
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
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  milestoneCard: {
    flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, marginLeft: 8,
  },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneLabel: { ...Typography.cardTitle, marginBottom: 4 },
  milestoneUnlocked: { ...Typography.caption },
  milestoneSublabel: { ...Typography.caption },
  milestoneProgressBar: { height: 3, borderRadius: 1.5, marginTop: 8 },
  milestoneProgressFill: { height: 3, borderRadius: 1.5 },
  badgesTitle: { ...Typography.cardTitle, marginTop: 24, marginBottom: 12 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  badgeLabel: { ...Typography.caption },
});
