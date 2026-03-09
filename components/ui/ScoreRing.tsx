import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography, FontFamily } from '../../constants/typography';

interface ScoreRingProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ScoreRing({ score, size = 160, strokeWidth = 6, color }: ScoreRingProps) {
  const { colors } = useTheme();
  const strokeColor = color ?? colors.gold;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const animatedScore = useSharedValue(0);
  const displayScore = useSharedValue(0);

  useEffect(() => {
    animatedScore.value = withTiming(Math.min(Math.max(score, 0), 100), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
    displayScore.value = withTiming(Math.min(Math.max(score, 0), 100), {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, animatedScore, displayScore]);

  const animatedProps = useAnimatedProps(() => {
    const progress = animatedScore.value / 100;
    return {
      strokeDashoffset: circumference * (1 - progress),
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.borderDefault}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated fill */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <CountUpText value={score} color={strokeColor} />
        <Text style={[styles.maxLabel, { color: colors.textTertiary }]}>/ 100</Text>
      </View>
    </View>
  );
}

function CountUpText({ value, color }: { value: number; color: string }) {
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(interval);
      } else {
        setDisplay(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [value]);

  return <Text style={[styles.scoreText, { color }]}>{display}</Text>;
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: FontFamily.displayBold,
    fontSize: 48,
    lineHeight: 56,
  },
  maxLabel: {
    ...Typography.caption,
  },
});
