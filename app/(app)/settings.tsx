import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Switch,
  Modal, Alert, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import { getBoolean, setBoolean, getString, setString, StorageKeys } from '../../lib/utils/storage';
import { SUPPORTED_LANGUAGES, type Language } from '../../constants/languages';
import { exportUserData, deleteAllUserData } from '../../lib/data/export';
import { signOut } from '../../lib/auth/phone-auth';

const VOICE_SPEEDS = [
  { label: 'Slow', value: 0.8 },
  { label: 'Normal', value: 1.0 },
  { label: 'Fast', value: 1.2 },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, toggle } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { db } = useDatabase();
  const [biometricEnabled, setBiometricEnabled] = useState(() => getBoolean(StorageKeys.BIOMETRIC_ENABLED));
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => getBoolean(StorageKeys.NOTIFICATIONS_ENABLED));
  const [offlineMode, setOfflineMode] = useState(() => getBoolean(StorageKeys.OFFLINE_MODE));
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [voiceSpeedModalVisible, setVoiceSpeedModalVisible] = useState(false);
  const [voiceSpeed, setVoiceSpeedState] = useState(() => {
    const saved = getString(StorageKeys.VOICE_SPEED);
    return saved ? parseFloat(saved) : 1.0;
  });

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

  function handleLanguageSelect(lang: Language) {
    setLanguage(lang.code);
    setLanguageModalVisible(false);
  }

  function handleVoiceSpeedSelect(speed: number) {
    setVoiceSpeedState(speed);
    setString(StorageKeys.VOICE_SPEED, speed.toString());
    setVoiceSpeedModalVisible(false);
  }

  const handleExport = useCallback(async () => {
    if (!db) return;
    try {
      await exportUserData(db);
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
    }
  }, [db]);

  const handleDeleteData = useCallback(() => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all your health data, conversations, and scores. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            if (!db) return;
            try {
              await deleteAllUserData(db);
              await signOut();
              router.replace('/(auth)/language-detect');
            } catch (error) {
              Alert.alert('Error', 'Could not delete all data. Please try again.');
            }
          },
        },
      ],
    );
  }, [db, router]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/language-detect');
        },
      },
    ]);
  }, [router]);

  const currentSpeedLabel = VOICE_SPEEDS.find((s) => s.value === voiceSpeed)?.label ?? 'Normal';

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
          <SettingsRow
            label="Language"
            value={language.native}
            colors={colors}
            onPress={() => setLanguageModalVisible(true)}
          />
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
          <SettingsRow label="Sign Out" value="" colors={colors} onPress={handleSignOut} />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>PREFERENCES</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsRow
            label="Voice Speed"
            value={currentSpeedLabel}
            colors={colors}
            onPress={() => setVoiceSpeedModalVisible(true)}
          />
          <SettingsToggleRow
            label={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            value={mode === 'dark'}
            onToggle={() => toggle()}
            colors={colors}
          />
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
          <SettingsRow label="Export My Data" value="" colors={colors} onPress={handleExport} />
          <SettingsRow label="Delete My Data" value="" colors={colors} isDestructive onPress={handleDeleteData} />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textTertiary }]}>Maa v1.0.0</Text>
          <Text style={[styles.appInfoSubtext, { color: colors.textMuted }]}>Made with care in India</Text>
        </View>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal visible={languageModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setLanguageModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Language</Text>
            <FlatList
              data={SUPPORTED_LANGUAGES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.modalRow, { borderBottomColor: colors.borderSubtle }]}
                  onPress={() => handleLanguageSelect(item)}
                >
                  <Text style={[styles.modalRowScript, { color: colors.gold }]}>{item.script}</Text>
                  <View style={styles.modalRowText}>
                    <Text style={[styles.modalRowLabel, { color: colors.textPrimary }]}>{item.native}</Text>
                    <Text style={[styles.modalRowSublabel, { color: colors.textTertiary }]}>{item.name}</Text>
                  </View>
                  {item.code === language.code && (
                    <Text style={[styles.checkmark, { color: colors.gold }]}>OK</Text>
                  )}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Voice Speed Modal */}
      <Modal visible={voiceSpeedModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setVoiceSpeedModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Voice Speed</Text>
            {VOICE_SPEEDS.map((s) => (
              <Pressable
                key={s.label}
                style={[styles.modalRow, { borderBottomColor: colors.borderSubtle }]}
                onPress={() => handleVoiceSpeedSelect(s.value)}
              >
                <Text style={[styles.modalRowLabel, { color: colors.textPrimary }]}>{s.label}</Text>
                {s.value === voiceSpeed && (
                  <Text style={[styles.checkmark, { color: colors.gold }]}>OK</Text>
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  value,
  colors,
  isDestructive,
  onPress,
}: {
  label: string;
  value: string;
  colors: Record<string, string>;
  isDestructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.borderSubtle }]} onPress={onPress}>
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
  colors: Record<string, string>;
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  backText: { ...Typography.bodyMedium },
  title: { ...Typography.sectionHeader },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionLabel: { ...Typography.label, marginTop: 24, marginBottom: 8 },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, minHeight: 48,
  },
  rowLabel: { ...Typography.body },
  rowValue: { ...Typography.body },
  appInfo: { alignItems: 'center', marginTop: 40 },
  appInfoText: { ...Typography.caption },
  appInfoSubtext: { ...Typography.caption, marginTop: 4 },
  // Modal styles
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, maxHeight: '70%',
  },
  modalTitle: { ...Typography.sectionHeader, marginBottom: 16 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, gap: 12,
  },
  modalRowScript: { fontSize: 24, width: 36, textAlign: 'center' },
  modalRowText: { flex: 1 },
  modalRowLabel: { ...Typography.body },
  modalRowSublabel: { ...Typography.caption, marginTop: 2 },
  checkmark: { ...Typography.bodyMedium },
});
