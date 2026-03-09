import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';
import { BrainIcon } from '../../icons';
import type { CardContentProps } from './types';

export const MoodInsightCard = React.memo(function MoodInsightCard({ title, data, colors }: CardContentProps) {
  const moodTrend = data.trend as string | undefined;
  const avgMood = data.averageMood as number | undefined;

  return (
    <View style={styles.content}>
      <BrainIcon size={28} color="#7B68EE" />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {avgMood != null && (
        <Text style={[styles.bigNumber, { color: '#7B68EE' }]}>
          {avgMood.toFixed(1)} <Text style={styles.bigNumberUnit}>/5</Text>
        </Text>
      )}
      {moodTrend && (
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>{moodTrend}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 12 },
  title: { ...Typography.sectionHeader, textAlign: 'center' },
  subtext: { ...Typography.body, textAlign: 'center' },
  bigNumber: { fontSize: 48, fontFamily: 'PlayfairDisplay-Bold' },
  bigNumberUnit: { fontSize: 18, fontFamily: 'DMSans-Regular' },
});
