import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function VoiceHomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon} />
          <Text style={styles.logoText}>Maa</Text>
        </View>
        <Pressable onPress={() => router.push('/(app)/settings')}>
          <Text style={styles.gearIcon}>*</Text>
        </Pressable>
      </View>

      {/* The Orb */}
      <View style={styles.orbContainer}>
        <Pressable style={styles.orbOuter}>
          <View style={styles.orbRing3} />
          <View style={styles.orbRing2} />
          <View style={styles.orbRing1} />
          <View style={styles.orb}>
            <Text style={styles.micIcon}>*</Text>
          </View>
        </Pressable>
        <Text style={styles.orbLabel}>Tap to speak</Text>
      </View>

      {/* Suggested prompts */}
      <View style={styles.prompts}>
        <Pressable style={styles.promptChip}>
          <Text style={styles.promptText}>When is my next period?</Text>
        </Pressable>
        <Pressable style={styles.promptChip}>
          <Text style={styles.promptText}>Log today's mood</Text>
        </Pressable>
        <Pressable style={styles.promptChip}>
          <Text style={styles.promptText}>Am I ovulating?</Text>
        </Pressable>
      </View>

      {/* Privacy badge */}
      <View style={styles.privacyBadge}>
        <Text style={styles.privacyText}>Private & encrypted</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
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
    backgroundColor: Colors.gold,
  },
  logoText: {
    ...Typography.sectionHeader,
    color: Colors.textPrimary,
  },
  gearIcon: {
    fontSize: 24,
    color: Colors.textSecondary,
  },
  orbContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbOuter: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbRing3: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(218,165,32,0.08)',
  },
  orbRing2: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 1,
    borderColor: 'rgba(218,165,32,0.12)',
  },
  orbRing1: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 1.5,
    borderColor: 'rgba(218,165,32,0.18)',
  },
  orb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(218,165,32,0.15)',
    borderWidth: 2,
    borderColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.goldDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 8,
  },
  micIcon: {
    fontSize: 36,
    color: Colors.gold,
  },
  orbLabel: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 20,
  },
  prompts: {
    paddingHorizontal: 24,
    gap: 10,
    marginBottom: 24,
  },
  promptChip: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  promptText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  privacyBadge: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  privacyText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});
