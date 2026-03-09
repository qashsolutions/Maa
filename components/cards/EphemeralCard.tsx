/**
 * EphemeralCard — slides up from bottom, shows AI-generated insight, auto-dismisses.
 * The visual response layer for Gemini's visual_card output.
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
import { CloseIcon } from '../../icons';
import { CyclePredictionCard } from './CyclePredictionCard';
import { MoodInsightCard } from './MoodInsightCard';
import { ConfirmationCard } from './ConfirmationCard';
import { ProactiveInsightCard } from './ProactiveInsightCard';
import { GenericInsightCard } from './GenericInsightCard';

const CARD_HEIGHT = 280;
const AUTO_DISMISS_MS = 8000;

interface EphemeralCardProps {
  card: VisualCard;
  onDismiss: () => void;
}

export const EphemeralCard = React.memo(function EphemeralCard({ card, onDismiss }: EphemeralCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const translateY = useSharedValue(CARD_HEIGHT + 40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 300 });

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
});

function CardContent({ card, colors }: { card: VisualCard; colors: Record<string, string> }) {
  switch (card.type) {
    case 'cycle_prediction':
      return <CyclePredictionCard data={card.data} colors={colors} title={card.title} />;
    case 'mood_insight':
      return <MoodInsightCard data={card.data} colors={colors} title={card.title} />;
    case 'confirmation':
      return <ConfirmationCard data={card.data} colors={colors} title={card.title} />;
    case 'proactive_tip':
      return <ProactiveInsightCard data={card.data} colors={colors} title={card.title} />;
    default:
      return <GenericInsightCard data={card.data} colors={colors} title={card.title} />;
  }
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  card: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0,
    minHeight: CARD_HEIGHT, paddingHorizontal: 24, paddingBottom: 32,
  },
  handle: { alignItems: 'center', paddingVertical: 12 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  dismissButton: { alignItems: 'center', paddingVertical: 8 },
  dismissRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dismissText: { ...Typography.caption },
});
