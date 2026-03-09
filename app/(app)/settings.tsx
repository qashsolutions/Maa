import { View, Text, StyleSheet, Pressable, ScrollView, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useLanguage } from '../../contexts/LanguageContext';
import { getBoolean, setBoolean, StorageKeys } from '../../lib/utils/storage';
import { useState } from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, toggle } = useTheme();
  const { language } = useLanguage();
  const [biometricEnabled, setBiometricEnabled] = useState(() => getBoolean(StorageKeys.BIOMETRIC_ENABLED));
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => getBoolean(StorageKeys.NOTIFICATIONS_ENABLED));
  const [offlineMode, setOfflineMode] = useState(() => getBoolean(StorageKeys.OFFLINE_MODE));

  function handleBiometricToggle(value: boolean) {
    setBiometricEnabled(value);
    setBoolean(StorageKeys.BIOMETRIC_ENABLED, value);
  }

  function handleNotificationsToggle(value: boolean) {
    setNotificationsEnabled(value);
    setBoolean(StorageKeys.NOTIFICATIONS_ENABLED, value);
  }

  function handleOfflineModeToggle(value: boolean) {
    setOfflineMode(value);
    setBoolean(StorageKeys.OFFLINE_MODE, value);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={[styles.backText, { color: colors.gold }]}>Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsRow label="Language" value={language.native} colors={colors} />
          <SettingsToggleRow
            label="Biometric Lock"
            value={biometricEnabled}
            onToggle={handleBiometricToggle}
            colors={colors}
          />
          <SettingsToggleRow
            label="Notifications"
            value={notificationsEnabled}
            onToggle={handleNotificationsToggle}
            colors={colors}
          />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PREFERENCES</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsRow label="Voice & Speed" value="Normal" colors={colors} />
          <SettingsToggleRow
            label={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            value={mode === 'dark'}
            onToggle={() => toggle()}
            colors={colors}
          />
          <SettingsRow label="Health Profile" value="" colors={colors} />
        </View>

        {/* Data & Privacy */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>DATA & PRIVACY</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsToggleRow
            label="Offline Mode"
            value={offlineMode}
            onToggle={handleOfflineModeToggle}
            colors={colors}
          />
          <SettingsRow label="Export My Data" value="" colors={colors} />
          <SettingsRow label="Delete My Data" value="" colors={colors} isDestructive />
          <SettingsRow label="Privacy Policy" value="" colors={colors} />
        </View>

        {/* Subscription */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>SUBSCRIPTION</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsRow label="Current Plan" value="Free Trial" colors={colors} />
          <SettingsRow label="Manage Subscription" value="" colors={colors} />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textTertiary }]}>Maa v1.0.0</Text>
          <Text style={[styles.appInfoSubtext, { color: colors.textMuted }]}>Made with care in India</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  colors,
  isDestructive,
}: {
  label: string;
  value: string;
  colors: any;
  isDestructive?: boolean;
}) {
  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
      <Text style={[styles.rowLabel, { color: isDestructive ? colors.error : colors.textPrimary }]}>
        {label}
      </Text>
      {value ? <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text> : null}
    </Pressable>
  );
}

function SettingsToggleRow({
  label,
  value,
  onToggle,
  colors,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  colors: any;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.borderDefault, true: colors.gold }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  title: {
    ...Typography.sectionHeader,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    ...Typography.label,
    marginTop: 24,
    marginBottom: 8,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  rowLabel: {
    ...Typography.body,
  },
  rowValue: {
    ...Typography.body,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 40,
  },
  appInfoText: {
    ...Typography.caption,
  },
  appInfoSubtext: {
    ...Typography.caption,
    marginTop: 4,
  },
});
