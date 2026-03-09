import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { CalendarIcon } from '../../icons';
import type { CardContentProps } from './types';

export const CyclePredictionCard = React.memo(function CyclePredictionCard({ title, data, colors }: CardContentProps) {
  const { t } = useTranslation();
  const nextDate = data.nextPeriodDate as string | undefined;
  const daysUntil = data.daysUntil as number | undefined;
  const phase = data.currentPhase as string | undefined;

  return (
    <View style={styles.content}>
      <CalendarIcon size={28} color="#C4556E" />
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {phase && (
        <View style={[styles.phaseBadge, { backgroundColor: 'rgba(196,85,110,0.15)' }]}>
          <Text style={[styles.phaseText, { color: '#C4556E' }]}>{phase}</Text>
        </View>
      )}
      {daysUntil != null && (
        <Text style={[styles.bigNumber, { color: colors.gold }]}>
          {daysUntil} <Text style={styles.bigNumberUnit}>{t('cards.days')}</Text>
        </Text>
      )}
      {nextDate && (
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          {t('cards.expected', { date: nextDate })}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 12 },
  title: { ...Typography.sectionHeader, textAlign: 'center' },
  subtext: { ...Typography.body, textAlign: 'center' },
  phaseBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  phaseText: { ...Typography.label },
  bigNumber: { fontSize: 48, fontFamily: 'PlayfairDisplay-Bold' },
  bigNumberUnit: { fontSize: 18, fontFamily: 'DMSans-Regular' },
});
