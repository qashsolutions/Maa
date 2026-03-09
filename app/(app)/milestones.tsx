import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

type Tab = 'week' | 'milestones';

const MILESTONES = [
  { id: 'cycle_1', label: 'First Cycle', sublabel: 'Basic period prediction unlocked', cycles: 1 },
  { id: 'cycle_3', label: 'Pattern Finder', sublabel: 'Cross-cycle trend detection unlocked', cycles: 3 },
  { id: 'cycle_6', label: 'Mood Oracle', sublabel: 'Mood-cycle correlation + PMS prediction unlocked', cycles: 6 },
  { id: 'cycle_12', label: 'Body Whisperer', sublabel: 'Full annual rhythm map unlocked', cycles: 12 },
  { id: 'pregnancy', label: 'Pregnancy Guide', sublabel: 'Trimester-aware mode activated', cycles: 0 },
];

const BADGES = [
  { id: 'streak_3', label: '3-Week Streak', earned: false },
  { id: 'cycle_tracker', label: 'Cycle Tracker', earned: false },
  { id: 'perfect_month', label: 'Perfect Month', earned: false },
  { id: 'night_owl', label: 'Night Owl', earned: false },
  { id: 'mood_master', label: 'Mood Master', earned: false },
];

export default function MilestonesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('week');

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
              <Text style={[styles.streakCount, { color: colors.gold }]}>0</Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>week streak</Text>
            </View>

            {/* Weekly goals placeholder */}
            <Text style={[styles.goalsTitle, { color: colors.textPrimary }]}>Weekly Goals</Text>
            <View style={[styles.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
              <Text style={[styles.goalText, { color: colors.textSecondary }]}>
                Your weekly goals will appear here once you start using Maa.
                Have your first conversation to get started.
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Milestones timeline */}
            {MILESTONES.map((m, index) => (
              <View key={m.id} style={styles.milestoneRow}>
                <View style={styles.timelineCol}>
                  <View style={[styles.timelineDot, { borderColor: colors.borderDefault }]} />
                  {index < MILESTONES.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.borderDefault }]} />
                  )}
                </View>
                <View style={[styles.milestoneCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
                  <Text style={[styles.milestoneLabel, { color: colors.textPrimary }]}>{m.label}</Text>
                  <Text style={[styles.milestoneSublabel, { color: colors.textSecondary }]}>{m.sublabel}</Text>
                </View>
              </View>
            ))}

            {/* Badges */}
            <Text style={[styles.badgesTitle, { color: colors.textPrimary }]}>Badges</Text>
            <View style={styles.badgesGrid}>
              {BADGES.map((b) => (
                <View
                  key={b.id}
                  style={[styles.badgeCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault, opacity: 0.4 }]}
                >
                  <Text style={[styles.badgeLabel, { color: colors.textTertiary }]}>{b.label}</Text>
                </View>
              ))}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backText: { ...Typography.bodyMedium },
  title: { ...Typography.sectionHeader },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 24,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabText: { ...Typography.cardTitle },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  streakBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  streakCount: { fontSize: 36, fontFamily: 'PlayfairDisplay-Bold' },
  streakLabel: { ...Typography.body, marginTop: 4 },
  goalsTitle: { ...Typography.cardTitle, marginBottom: 12 },
  goalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  goalText: { ...Typography.body, lineHeight: 22 },
  milestoneRow: { flexDirection: 'row', marginBottom: 0 },
  timelineCol: { width: 32, alignItems: 'center' },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 4,
  },
  timelineLine: { width: 2, flex: 1, marginVertical: 4 },
  milestoneCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    marginLeft: 8,
  },
  milestoneLabel: { ...Typography.cardTitle, marginBottom: 4 },
  milestoneSublabel: { ...Typography.caption },
  badgesTitle: { ...Typography.cardTitle, marginTop: 24, marginBottom: 12 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  badgeLabel: { ...Typography.caption },
});
