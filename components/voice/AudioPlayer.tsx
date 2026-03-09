/**
 * AudioPlayer — reusable audio playback card with play/pause, progress bar, and duration.
 * Used in weekly summary and anywhere TTS audio needs a player UI.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { PlayIcon, PauseIcon, SpeakerIcon } from '../../icons';

interface AudioPlayerProps {
  isPlaying: boolean;
  progress: number; // 0-1
  position: string; // formatted e.g. "0:45"
  duration: string; // formatted e.g. "1:30"
  audioAvailable: boolean;
  unavailableText?: string;
  onPlay: () => void;
  onPause: () => void;
}

export const AudioPlayer = React.memo(function AudioPlayer({
  isPlaying,
  progress,
  position,
  duration,
  audioAvailable,
  unavailableText,
  onPlay,
  onPause,
}: AudioPlayerProps) {
  const { colors } = useTheme();

  if (!audioAvailable) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
        <View style={[styles.playButton, { backgroundColor: colors.borderDefault }]}>
          <SpeakerIcon size={20} color={colors.textMuted} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.duration, { color: colors.textTertiary }]}>
            {unavailableText ?? 'Audio unavailable'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
      <Pressable
        style={[styles.playButton, { backgroundColor: colors.gold }]}
        onPress={isPlaying ? onPause : onPlay}
      >
        {isPlaying ? (
          <PauseIcon size={20} color={colors.bgPrimary} />
        ) : (
          <PlayIcon size={20} color={colors.bgPrimary} />
        )}
      </Pressable>
      <View style={styles.info}>
        <Text style={[styles.duration, { color: colors.textSecondary }]}>
          {position} / {duration || '0:00'}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderDefault }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.gold, width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 8,
  },
  duration: {
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
});
