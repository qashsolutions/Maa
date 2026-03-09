import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { VoiceOrb } from '../../components/voice/VoiceOrb';
import { EphemeralCard } from '../../components/cards/EphemeralCard';
import { useVoiceSession } from '../../hooks/useVoiceSession';
import { useTranslation } from '../../hooks/useTranslation';

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
    startListening,
    processText,
    dismissCard,
  } = useVoiceSession();

  const handleOrbPress = () => {
    startListening();
  };

  const handlePromptPress = (prompt: string) => {
    processText(prompt);
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
          <Text style={[styles.gearIcon, { color: colors.textSecondary }]}>*</Text>
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

      {/* Privacy badge */}
      <View style={styles.privacyBadge}>
        <Text style={[styles.privacyText, { color: colors.textMuted }]}>
          {t('voice.privateEncrypted')}
        </Text>
      </View>

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
  gearIcon: {
    fontSize: 24,
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
  privacyBadge: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  privacyText: {
    ...Typography.caption,
  },
});
