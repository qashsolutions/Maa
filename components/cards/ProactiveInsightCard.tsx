import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { InfoIcon } from '../../icons';
import type { CardContentProps } from './types';

export const ProactiveInsightCard = React.memo(function ProactiveInsightCard({ title, data, colors }: CardContentProps) {
  const { t } = useTranslation();
  const body = data.body as string | undefined;
  const actions = data.actions as string[] | undefined;

  return (
    <View style={styles.content}>
      <View style={[styles.badge, { backgroundColor: 'rgba(218,165,32,0.15)' }]}>
        <InfoIcon size={14} color={colors.gold} />
        <Text style={[styles.badgeText, { color: colors.gold }]}>
          {t('cards.proactiveInsight')}
        </Text>
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {body && (
        <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
      )}
      {actions && actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action, i) => (
            <Pressable
              key={i}
              style={[styles.actionBtn, { borderColor: colors.borderGold }]}
            >
              <Text style={[styles.actionText, { color: colors.gold }]}>{action}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 12 },
  title: { ...Typography.sectionHeader, textAlign: 'center' },
  body: { ...Typography.body, textAlign: 'center', lineHeight: 22 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { ...Typography.label },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { ...Typography.bodyMedium },
});
