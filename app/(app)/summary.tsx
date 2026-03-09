import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function WeeklySummaryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backText, { color: colors.gold }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Weekly Summary</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: colors.bgGoldSubtle, borderColor: colors.borderGold }]}>
          <Text style={[styles.badgeText, { color: colors.gold }]}>WEEKLY SUMMARY</Text>
        </View>

        {/* Audio player placeholder */}
        <View style={[styles.playerCard, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <Pressable style={[styles.playButton, { backgroundColor: colors.gold }]}>
            <Text style={[styles.playIcon, { color: colors.bgPrimary }]}>*</Text>
          </Pressable>
          <View style={styles.playerInfo}>
            <Text style={[styles.playerDuration, { color: colors.textSecondary }]}>0:00 / 1:30</Text>
            <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.gold, width: '0%' }]} />
            </View>
          </View>
        </View>

        {/* Empty state */}
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          Your first weekly summary will appear here after your first week with Maa.
          Keep talking -- she learns more every day.
        </Text>
      </View>
    </SafeAreaView>
  );
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
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginBottom: 24,
  },
  badgeText: {
    ...Typography.label,
  },
  playerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 32,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 20,
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
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
});
