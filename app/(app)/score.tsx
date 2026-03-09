import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function ScoreScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Maa Score</Text>

      {/* Score ring placeholder */}
      <View style={styles.scoreRing}>
        <Text style={styles.scoreNumber}>0</Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>

      <Text style={styles.motivation}>
        Maa is learning your patterns. Keep talking -- she gets smarter every week.
      </Text>

      {/* Pillar cards */}
      <View style={styles.pillars}>
        <PillarCard label="Cycle Intelligence" score={0} max={25} color={Colors.period} />
        <PillarCard label="Mood Map" score={0} max={25} color={Colors.mood} />
        <PillarCard label="Body Awareness" score={0} max={25} color={Colors.energy} />
        <PillarCard label="Consistency" score={0} max={25} color={Colors.streak} />
      </View>
    </SafeAreaView>
  );
}

function PillarCard({
  label,
  score,
  max,
  color,
}: {
  label: string;
  score: number;
  max: number;
  color: string;
}) {
  return (
    <View style={styles.pillarCard}>
      <View style={[styles.pillarDot, { backgroundColor: color }]} />
      <View style={styles.pillarInfo}>
        <Text style={styles.pillarLabel}>{label}</Text>
        <Text style={styles.pillarScore}>
          {score}/{max}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(score / max) * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 24,
  },
  title: {
    ...Typography.sectionHeader,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 24,
  },
  scoreRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 6,
    borderColor: Colors.borderGold,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 32,
  },
  scoreNumber: {
    ...Typography.hero,
    color: Colors.gold,
    fontSize: 48,
  },
  scoreLabel: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  motivation: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  pillars: {
    gap: 12,
  },
  pillarCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  pillarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  pillarInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pillarLabel: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  pillarScore: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.borderDefault,
    borderRadius: 2,
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
});
