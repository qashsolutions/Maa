/**
 * WaveformBars — animated audio visualization bars inside the VoiceOrb.
 * 9 bars with symmetric height pattern, staggered animation timing.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import type { VoiceState } from '../../lib/ai/types';

interface WaveformBarsProps {
  state: VoiceState;
  color: string;
}

export const WaveformBars = React.memo(function WaveformBars({ state, color }: WaveformBarsProps) {
  const bars = [
    useSharedValue(0.2),
    useSharedValue(0.3),
    useSharedValue(0.5),
    useSharedValue(0.7),
    useSharedValue(0.9),
    useSharedValue(0.7),
    useSharedValue(0.5),
    useSharedValue(0.3),
    useSharedValue(0.2),
  ];

  useEffect(() => {
    const intensity = state === 'listening' ? 1.0 : 0.5;
    const speed = state === 'listening' ? 300 : 500;

    bars.forEach((bar, i) => {
      bar.value = withRepeat(
        withSequence(
          withTiming(0.2 + Math.random() * 0.6 * intensity, {
            duration: speed + i * 30,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0.1 + Math.random() * 0.3 * intensity, {
            duration: speed + i * 30,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
    });
  }, [state]);

  return (
    <View style={styles.waveform}>
      {bars.map((bar, i) => (
        <WaveformBar key={i} heightValue={bar} color={color} />
      ))}
    </View>
  );
});

function WaveformBar({
  heightValue,
  color,
}: {
  heightValue: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    height: interpolate(heightValue.value, [0, 1], [6, 36]),
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
  },
});
