import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';
import type { CardContentProps } from './types';

export const GenericInsightCard = React.memo(function GenericInsightCard({ title, data, colors }: CardContentProps) {
  const body = data.body as string | undefined;

  return (
    <View style={styles.content}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {body && (
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 12 },
  title: { ...Typography.sectionHeader, textAlign: 'center' },
  body: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
});
