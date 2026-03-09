/**
 * VoiceOrb — THE core UI of Maa. An animated orb that responds to voice state.
 *
 * States:
 * - idle: subtle breathing scale (1.0 -> 1.04)
 * - listening: expanded (1.12), brighter rings, waveform bars
 * - thinking: pulsing glow
 * - speaking: gentle waveform, TTS playing
 * - error: red flash then back to idle
 */
import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import type { VoiceState } from '../../lib/ai/types';
import { useTheme } from '../../contexts/ThemeContext';
import { MicrophoneIcon } from '../../icons';
import { WaveformBars } from './WaveformBars';

interface VoiceOrbProps {
  state: VoiceState;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const VoiceOrb = React.memo(function VoiceOrb({ state, onPress }: VoiceOrbProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.15);
  const ring1Opacity = useSharedValue(0.18);
  const ring2Opacity = useSharedValue(0.12);
  const ring3Opacity = useSharedValue(0.08);
  const pulsePhase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(glowOpacity);
    cancelAnimation(pulsePhase);

    switch (state) {
      case 'idle':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        );
        glowOpacity.value = withTiming(0.15, { duration: 500 });
        ring1Opacity.value = withTiming(0.18, { duration: 300 });
        ring2Opacity.value = withTiming(0.12, { duration: 300 });
        ring3Opacity.value = withTiming(0.08, { duration: 300 });
        break;

      case 'listening':
        scale.value = withSpring(1.12, { damping: 12, stiffness: 100 });
        glowOpacity.value = withTiming(0.35, { duration: 300 });
        ring1Opacity.value = withTiming(0.4, { duration: 300 });
        ring2Opacity.value = withTiming(0.25, { duration: 300 });
        ring3Opacity.value = withTiming(0.15, { duration: 300 });
        pulsePhase.value = withRepeat(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        );
        break;

      case 'thinking':
        scale.value = withTiming(1.06, { duration: 300 });
        glowOpacity.value = withRepeat(
          withSequence(
            withTiming(0.4, { duration: 600 }),
            withTiming(0.15, { duration: 600 }),
          ),
          -1,
          true,
        );
        ring1Opacity.value = withRepeat(
          withSequence(
            withTiming(0.35, { duration: 600 }),
            withTiming(0.18, { duration: 600 }),
          ),
          -1,
          true,
        );
        break;

      case 'speaking':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.02, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          true,
        );
        glowOpacity.value = withTiming(0.25, { duration: 400 });
        ring1Opacity.value = withTiming(0.25, { duration: 300 });
        break;

      case 'error':
        scale.value = withSequence(
          withTiming(0.95, { duration: 100 }),
          withTiming(1.05, { duration: 100 }),
          withTiming(1.0, { duration: 200 }),
        );
        glowOpacity.value = withTiming(0.1, { duration: 300 });
        break;
    }
  }, [state, scale, glowOpacity, ring1Opacity, ring2Opacity, ring3Opacity, pulsePhase]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(218,165,32,${glowOpacity.value})`,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    borderColor: `rgba(218,165,32,${ring1Opacity.value})`,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    borderColor: `rgba(218,165,32,${ring2Opacity.value})`,
  }));

  const ring3Style = useAnimatedStyle(() => ({
    borderColor: `rgba(218,165,32,${ring3Opacity.value})`,
  }));

  const showWaveform = state === 'listening' || state === 'speaking';

  return (
    <View style={styles.container}>
      <AnimatedPressable style={[styles.orbOuter, orbStyle]} onPress={onPress}>
        <Animated.View style={[styles.ring3, ring3Style]} />
        <Animated.View style={[styles.ring2, ring2Style]} />
        <Animated.View style={[styles.ring1, ring1Style]} />

        <Animated.View
          style={[
            styles.orb,
            glowStyle,
            { borderColor: state === 'error' ? colors.error : colors.gold },
          ]}
        >
          {showWaveform ? (
            <WaveformBars state={state} color={colors.gold} />
          ) : (
            <MicrophoneIcon size={36} color={colors.gold} />
          )}
        </Animated.View>
      </AnimatedPressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  orbOuter: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center' },
  ring3: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1 },
  ring2: { position: 'absolute', width: 188, height: 188, borderRadius: 94, borderWidth: 1 },
  ring1: { position: 'absolute', width: 156, height: 156, borderRadius: 78, borderWidth: 1.5 },
  orb: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#B8860B', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 32, elevation: 8,
  },
});
