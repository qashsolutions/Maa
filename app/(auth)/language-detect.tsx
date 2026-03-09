import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { SUPPORTED_LANGUAGES, Language } from '../../constants/languages';
import { useLanguage } from '../../contexts/LanguageContext';
import { detectLanguageFromLocation } from '../../lib/auth/location-language';
import { useTranslation } from '../../hooks/useTranslation';
import { TargetIcon } from '../../icons';

export default function LanguageDetectScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(true);
  const [detectedState, setDetectedState] = useState<string | null>(null);

  // Auto-detect language from location on mount
  useEffect(() => {
    async function detect() {
      try {
        const result = await detectLanguageFromLocation();
        if (result.permissionGranted && result.languageCode) {
          setSelectedCode(result.languageCode);
          setLanguage(result.languageCode);
          setDetectedState(result.state);
        }
      } catch {
        // Fall through to manual selection
      } finally {
        setDetecting(false);
      }
    }
    detect();
  }, [setLanguage]);

  function handleSelect(lang: Language) {
    setSelectedCode(lang.code);
    setLanguage(lang.code);
  }

  function handleContinue() {
    if (selectedCode) {
      router.push('/(auth)/phone-otp');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.chooseLanguage')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('auth.maaWillSpeak')}
        </Text>
        {detecting && (
          <View style={styles.pulseContainer}>
            <GeoPulseAnimation color={colors.gold} />
            <Text style={[styles.detectingText, { color: colors.textTertiary }]}>
              {t('auth.detectingLocation')}
            </Text>
          </View>
        )}
        {detectedState && !detecting && (
          <Text style={[styles.detectedText, { color: colors.gold }]}>
            {t('auth.detected', { state: detectedState })}
          </Text>
        )}
      </View>

      <FlatList
        data={SUPPORTED_LANGUAGES}
        numColumns={2}
        keyExtractor={(item) => item.code}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const isSelected = selectedCode === item.code;
          return (
            <Pressable
              style={[
                styles.langCard,
                { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
                isSelected && { borderColor: colors.gold, backgroundColor: colors.bgGoldSubtle },
              ]}
              onPress={() => handleSelect(item)}
            >
              <Text style={[styles.script, { color: colors.gold }]}>{item.script}</Text>
              <Text style={[styles.nativeName, { color: colors.textPrimary }]}>{item.native}</Text>
              <Text style={[styles.englishName, { color: colors.textSecondary }]}>{item.name}</Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={[styles.button, { backgroundColor: colors.gold }, !selectedCode && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!selectedCode}
      >
        <Text style={[styles.buttonText, { color: colors.bgPrimary }]}>{t('common.continue')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function GeoPulseAnimation({ color }: { color: string }) {
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    const expand = (delay: number) =>
      withDelay(delay, withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ));
    ring1.value = expand(0);
    ring2.value = expand(500);
    ring3.value = expand(1000);
    iconScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
    );
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring1.value * 1.5 }],
    opacity: 1 - ring1.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring2.value * 1.5 }],
    opacity: 1 - ring2.value,
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + ring3.value * 1.5 }],
    opacity: 1 - ring3.value,
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View style={styles.pulseWrapper}>
      <Animated.View style={[styles.pulseRing, { borderColor: color }, ring1Style]} />
      <Animated.View style={[styles.pulseRing, { borderColor: color }, ring2Style]} />
      <Animated.View style={[styles.pulseRing, { borderColor: color }, ring3Style]} />
      <Animated.View style={[styles.pulseCenter, iconStyle]}>
        <TargetIcon size={28} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    ...Typography.sectionHeader,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
  },
  pulseContainer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 16,
  },
  pulseWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  pulseCenter: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectingText: {
    ...Typography.caption,
  },
  detectedText: {
    ...Typography.caption,
    marginTop: 8,
  },
  grid: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  langCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  script: {
    fontSize: 32,
    marginBottom: 8,
  },
  nativeName: {
    ...Typography.cardTitle,
    marginBottom: 4,
  },
  englishName: {
    ...Typography.caption,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...Typography.cardTitle,
  },
});
