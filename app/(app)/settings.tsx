import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { language } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.section}>
          <SettingsRow label="Language" value={language.native} />
          <SettingsRow label="Biometric Lock" value="Off" />
          <SettingsRow label="Notifications" value="On" />
        </View>

        {/* Preferences */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.section}>
          <SettingsRow label="Voice & Speed" value="Normal" />
          <SettingsRow label="Health Profile" value="" />
        </View>

        {/* Data & Privacy */}
        <Text style={styles.sectionLabel}>DATA & PRIVACY</Text>
        <View style={styles.section}>
          <SettingsRow label="Offline Mode" value="Off" />
          <SettingsRow label="Export My Data" value="" />
          <SettingsRow label="Delete My Data" value="" isDestructive />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Maa v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Made with care in India</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  isDestructive,
}: {
  label: string;
  value: string;
  isDestructive?: boolean;
}) {
  return (
    <Pressable style={styles.row}>
      <Text style={[styles.rowLabel, isDestructive && styles.destructive]}>
        {label}
      </Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backText: {
    ...Typography.bodyMedium,
    color: Colors.gold,
  },
  title: {
    ...Typography.sectionHeader,
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.textTertiary,
    marginTop: 24,
    marginBottom: 8,
  },
  section: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  rowLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  rowValue: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  destructive: {
    color: Colors.error,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  appInfoText: {
    ...Typography.caption,
    color: Colors.textTertiary,
  },
  appInfoSubtext: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
