import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { VoiceOrb } from '../../components/voice/VoiceOrb';
import { EphemeralCard } from '../../components/cards/EphemeralCard';
import { QuickAccessDrawer } from '../../components/QuickAccessDrawer';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import { useTranslation } from '../../hooks/useTranslation';
import type { NavigationTarget } from '../../lib/ai/types';
import { SettingsIcon, ShieldCheckIcon, ChevronRightIcon, ChevronUpIcon } from '../../icons';

const STATE_LABEL_KEYS: Record<string, string> = {
  idle: 'voice.tapToSpeak',
  listening: 'voice.listening',
  thinking: 'voice.thinking',
  speaking: 'voice.speaking',
  error: 'voice.error',
};

const PROMPT_KEYS = [
  'voice.promptPeriod',
  'voice.promptMood',
  'voice.promptOvulation',
];

const NAV_ROUTES: Record<NonNullable<NavigationTarget>, string> = {
  score: '/(app)/score',
  settings: '/(app)/settings',
  summary: '/(app)/summary',
  milestones: '/(app)/milestones',
};

export default function VoiceHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const {
    voiceState,
    transcript,
    lastResponse,
    activeCard,
    error,
    navigationTarget,
    startListening,
    processText,
    dismissCard,
    clearNavigationTarget,
  } = useVoiceSession();

  const [textInputVisible, setTextInputVisible] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);

  const openDrawer = useCallback(() => setDrawerVisible(true), []);

  const swipeUpGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationY < -80) {
        runOnJS(openDrawer)();
      }
    });

  // Navigate when a voice command navigation target is detected
  useEffect(() => {
    if (navigationTarget) {
      const route = NAV_ROUTES[navigationTarget];
      clearNavigationTarget();
      router.push(route as never);
    }
  }, [navigationTarget, clearNavigationTarget, router]);

  const handleOrbPress = () => {
    startListening();
  };

  const handlePromptPress = (prompt: string) => {
    processText(prompt);
  };

  const handleTextSubmit = () => {
    const trimmed = textInputValue.trim();
    if (!trimmed) return;
    processText(trimmed);
    setTextInputValue('');
    setTextInputVisible(false);
    Keyboard.dismiss();
  };

  const showPrompts = voiceState === 'idle';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={[styles.logoIcon, { backgroundColor: colors.gold }]} />
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>Maa</Text>
        </View>
        <Pressable onPress={() => router.push('/(app)/settings')} hitSlop={12}>
          <SettingsIcon size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* The Orb */}
      <View style={styles.orbContainer}>
        <VoiceOrb state={voiceState} onPress={handleOrbPress} />
        <Text style={[styles.orbLabel, { color: colors.textSecondary }]}>
          {t(STATE_LABEL_KEYS[voiceState] ?? 'voice.tapToSpeak')}
        </Text>

        {/* Show transcript/response when active */}
        {transcript && voiceState !== 'idle' && (
          <Text
            style={[styles.transcript, { color: colors.textTertiary }]}
            numberOfLines={2}
          >
            {transcript}
          </Text>
        )}
        {lastResponse && voiceState === 'speaking' && (
          <Text
            style={[styles.response, { color: colors.textSecondary }]}
            numberOfLines={3}
          >
            {lastResponse}
          </Text>
        )}
        {error && (
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        )}
      </View>

      {/* Bottom section — swipe-up gesture zone */}
      <GestureDetector gesture={swipeUpGesture}>
        <View>
          {/* Suggested prompts — fade when not idle */}
          {showPrompts && (
            <View style={styles.prompts}>
              {PROMPT_KEYS.map((key) => {
                const prompt = t(key);
                return (
                  <Pressable
                    key={key}
                    style={[styles.promptChip, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}
                    onPress={() => handlePromptPress(prompt)}
                  >
                    <Text style={[styles.promptText, { color: colors.textSecondary }]}>{prompt}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Text input fallback */}
          {showPrompts && !textInputVisible && (
            <Pressable
              style={styles.typeInsteadRow}
              onPress={() => setTextInputVisible(true)}
              hitSlop={8}
            >
              <Text style={[styles.typeInsteadText, { color: colors.textMuted }]}>
                {t('voice.typeInstead')}
              </Text>
            </Pressable>
          )}
          {textInputVisible && (
            <View style={[styles.textInputRow, { borderColor: colors.borderDefault }]}>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderDefault }]}
                placeholder={t('voice.typePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={textInputValue}
                onChangeText={setTextInputValue}
                onSubmitEditing={handleTextSubmit}
                returnKeyType="send"
                autoFocus
                blurOnSubmit={false}
              />
              <Pressable
                style={[styles.sendButton, { backgroundColor: colors.gold }]}
                onPress={handleTextSubmit}
                hitSlop={8}
              >
                <ChevronRightIcon size={20} color={colors.bgPrimary} />
              </Pressable>
            </View>
          )}

          {/* Swipe-up hint chevron */}
          <View style={styles.chevronHint}>
            <ChevronUpIcon size={16} color={colors.textMuted} />
          </View>

          {/* Privacy badge */}
          <View style={styles.privacyBadge}>
            <View style={styles.privacyRow}>
              <ShieldCheckIcon size={14} color={colors.textMuted} />
              <Text style={[styles.privacyText, { color: colors.textMuted }]}>
                {t('voice.privateEncrypted')}
              </Text>
            </View>
          </View>
        </View>
      </GestureDetector>

      {/* Quick access drawer */}
      <QuickAccessDrawer visible={drawerVisible} onDismiss={() => setDrawerVisible(false)} />

      {/* Ephemeral card overlay */}
      {activeCard && <EphemeralCard card={activeCard} onDismiss={dismissCard} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoText: {
    ...Typography.sectionHeader,
  },
  orbContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbLabel: {
    ...Typography.bodyMedium,
    marginTop: 20,
  },
  transcript: {
    ...Typography.caption,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  response: {
    ...Typography.body,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  errorText: {
    ...Typography.caption,
    marginTop: 8,
  },
  prompts: {
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 24,
  },
  promptChip: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
  },
  promptText: {
    ...Typography.body,
  },
  typeInsteadRow: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  typeInsteadText: {
    ...Typography.caption,
    textDecorationLine: 'underline',
  },
  textInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
    gap: 10,
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronHint: {
    alignItems: 'center',
    opacity: 0.4,
    paddingTop: 4,
    paddingBottom: 2,
  },
  privacyBadge: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  privacyText: {
    ...Typography.caption,
  },
});
