import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';
import { CheckIcon } from '../../icons';
import type { CardContentProps } from './types';

export const ConfirmationCard = React.memo(function ConfirmationCard({ title, data, colors }: CardContentProps) {
  const message = data.message as string | undefined;

  return (
    <View style={styles.content}>
      <View style={[styles.checkCircle, { borderColor: colors.success }]}>
        <CheckIcon size={24} color={colors.success} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {message && (
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 12 },
  title: { ...Typography.sectionHeader, textAlign: 'center' },
  subtext: { ...Typography.body, textAlign: 'center' },
  checkCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
});
