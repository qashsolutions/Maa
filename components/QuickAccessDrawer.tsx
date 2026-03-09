/**
 * QuickAccessDrawer -- slide-up bottom sheet for quick navigation.
 * Triggered by swipe-up gesture on Voice Home.
 * NO tab bar (hard rule) -- this is the alternative.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { Typography } from '../constants/typography';
import { HeartIcon, AudioWaveIcon, TrophyIcon, ChevronRightIcon } from '../icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const DRAWER_HEIGHT = 280;

interface QuickAccessDrawerProps {
  visible: boolean;
  onDismiss: () => void;
}

const NAV_ITEMS = [
  { route: '/(app)/score', labelKey: 'score.title', Icon: HeartIcon },
  { route: '/(app)/summary', labelKey: 'summary.title', Icon: AudioWaveIcon },
  { route: '/(app)/milestones', labelKey: 'milestones.title', Icon: TrophyIcon },
] as const;

export const QuickAccessDrawer = React.memo(function QuickAccessDrawer({ visible, onDismiss }: QuickAccessDrawerProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const translateY = useSharedValue(DRAWER_HEIGHT);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(DRAWER_HEIGHT, { damping: 20, stiffness: 200 });
      backdropOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, translateY, backdropOpacity]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleNavigate = (route: string) => {
    onDismiss();
    router.push(route as never);
  };

  return (
    <>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          drawerStyle,
          {
            backgroundColor: colors.bgPrimary,
            borderTopColor: colors.borderDefault,
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: colors.textMuted }]} />
        </View>

        {/* Navigation rows */}
        {NAV_ITEMS.map(({ route, labelKey, Icon }) => (
          <Pressable
            key={route}
            style={[styles.navRow, { borderBottomColor: colors.borderSubtle }]}
            onPress={() => handleNavigate(route)}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.bgCard }]}>
              <Icon size={22} color={colors.gold} />
            </View>
            <Text style={[styles.navLabel, { color: colors.textPrimary }]}>
              {t(labelKey)}
            </Text>
            <ChevronRightIcon size={18} color={colors.textTertiary} />
          </Pressable>
        ))}
      </Animated.View>
    </>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 32,
    zIndex: 11,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    ...Typography.bodyMedium,
    flex: 1,
    marginLeft: 16,
  },
});
