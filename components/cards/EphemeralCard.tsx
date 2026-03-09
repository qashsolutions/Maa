/**
 * EphemeralCard — slides up from bottom, shows AI-generated insight, auto-dismisses.
 * The visual response layer for Gemini's visual_card output.
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import type { VisualCard } from '../../lib/ai/types';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import { CloseIcon, CheckIcon, CalendarIcon, BrainIcon } from '../../icons';

const CARD_HEIGHT = 280;
const AUTO_DISMISS_MS = 8000;

interface EphemeralCardProps {
  card: VisualCard;
  onDismiss: () => void;
}

export function EphemeralCard({ card, onDismiss }: EphemeralCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const translateY = useSharedValue(CARD_HEIGHT + 40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Slide in
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 300 });

    // Auto-dismiss after delay
    translateY.value = withDelay(
      AUTO_DISMISS_MS,
      withTiming(CARD_HEIGHT + 40, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      }),
    );
  }, [translateY, opacity, onDismiss]);

  const dismiss = () => {
    translateY.value = withTiming(CARD_HEIGHT + 40, { duration: 300 }, (finished) => {
      if (finished) runOnJS(onDismiss)();
    });
    opacity.value = withTiming(0, { duration: 200 });
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.3,
  }));

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          cardStyle,
          { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
        ]}
      >
        <View style={styles.handle}>
          <View style={[styles.handleBar, { backgroundColor: colors.textMuted }]} />
        </View>

        <CardContent card={card} colors={colors} />

        <Pressable style={styles.dismissButton} onPress={dismiss} hitSlop={12}>
          <View style={styles.dismissRow}>
            <CloseIcon size={14} color={colors.textTertiary} />
            <Text style={[styles.dismissText, { color: colors.textTertiary }]}>{t('cards.dismiss')}</Text>
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function CardContent({
  card,
  colors,
}: {
  card: VisualCard;
  colors: Record<string, string>;
}) {
  switch (card.type) {
    case 'cycle_prediction':
      return <CyclePredictionCard data={card.data} colors={colors} title={card.title} />;
    case 'mood_insight':
      return <MoodInsightCard data={card.data} colors={colors} title={card.title} />;
    case 'confirmation':
      return <ConfirmationCard data={card.data} colors={colors} title={card.title} />;
    default:
      return <GenericInsightCard data={card.data} colors={colors} title={card.title} />;
  }
}

function CyclePredictionCard({
  title,
  data,
  colors,
}: {
  title: string;
  data: Record<string, unknown>;
  colors: Record<string, string>;
}) {
  const { t } = useTranslation();
  const nextDate = data.nextPeriodDate as string | undefined;
  const daysUntil = data.daysUntil as number | undefined;
  const phase = data.currentPhase as string | undefined;

  return (
    <View style={styles.cardContent}>
      <CalendarIcon size={28} color="#C4556E" />
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
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
        <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>
          {t('cards.expected', { date: nextDate })}
        </Text>
      )}
    </View>
  );
}

function MoodInsightCard({
  title,
  data,
  colors,
}: {
  title: string;
  data: Record<string, unknown>;
  colors: Record<string, string>;
}) {
  const moodTrend = data.trend as string | undefined;
  const avgMood = data.averageMood as number | undefined;

  return (
    <View style={styles.cardContent}>
      <BrainIcon size={28} color="#7B68EE" />
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      {avgMood != null && (
        <Text style={[styles.bigNumber, { color: '#7B68EE' }]}>
          {avgMood.toFixed(1)} <Text style={styles.bigNumberUnit}>/5</Text>
        </Text>
      )}
      {moodTrend && (
        <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>{moodTrend}</Text>
      )}
    </View>
  );
}

function ConfirmationCard({
  title,
  data,
  colors,
}: {
  title: string;
  data: Record<string, unknown>;
  colors: Record<string, string>;
}) {
  const message = data.message as string | undefined;

  return (
    <View style={styles.cardContent}>
      <View style={[styles.checkCircle, { borderColor: colors.success }]}>
        <CheckIcon size={24} color={colors.success} />
      </View>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      {message && (
        <Text style={[styles.cardSubtext, { color: colors.textSecondary }]}>{message}</Text>
      )}
    </View>
  );
}

function GenericInsightCard({
  title,
  data,
  colors,
}: {
  title: string;
  data: Record<string, unknown>;
  colors: Record<string, string>;
}) {
  const body = data.body as string | undefined;

  return (
    <View style={styles.cardContent}>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{title}</Text>
      {body && (
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>{body}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    minHeight: CARD_HEIGHT,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  handle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  cardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  cardTitle: {
    ...Typography.sectionHeader,
    textAlign: 'center',
  },
  cardSubtext: {
    ...Typography.body,
    textAlign: 'center',
  },
  cardBody: {
    ...Typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  phaseBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  phaseText: {
    ...Typography.label,
  },
  bigNumber: {
    fontSize: 48,
    fontFamily: 'PlayfairDisplay-Bold',
  },
  bigNumberUnit: {
    fontSize: 18,
    fontFamily: 'DMSans-Regular',
  },
  checkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dismissText: {
    ...Typography.caption,
  },
});
