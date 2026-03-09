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
import { useTranslation } from '../../hooks/useTranslation';
import {
  ChevronLeftIcon, ChevronRightIcon, GlobeIcon, LockIcon,
  BellIcon, LogOutIcon, SpeakerIcon, MoonIcon, SunIcon,
  WifiOffIcon, DownloadIcon, TrashIcon, CheckIcon,
  HeartIcon, ShieldCheckIcon, StarIcon, UserIcon,
} from '../../icons';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, mode, toggle } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { db } = useDatabase();
  const { t } = useTranslation();
  const [biometricEnabled, setBiometricEnabled] = useState(() => getBoolean(StorageKeys.BIOMETRIC_ENABLED));
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => getBoolean(StorageKeys.NOTIFICATIONS_ENABLED));
  const [offlineMode, setOfflineMode] = useState(() => getBoolean(StorageKeys.OFFLINE_MODE));
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [voiceSpeedModalVisible, setVoiceSpeedModalVisible] = useState(false);
  const [voiceGenderModalVisible, setVoiceGenderModalVisible] = useState(false);
  const [voiceSpeed, setVoiceSpeedState] = useState(() => {
    const saved = getString(StorageKeys.VOICE_SPEED);
    return saved ? parseFloat(saved) : 1.0;
  });
  const [voiceGender, setVoiceGenderState] = useState(() => {
    return getString(StorageKeys.VOICE_GENDER) ?? 'female';
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

  function handleVoiceGenderSelect(gender: string) {
    setVoiceGenderState(gender);
    setString(StorageKeys.VOICE_GENDER, gender);
    setVoiceGenderModalVisible(false);
  }

  const handleExport = useCallback(async () => {
    if (!db) return;
    try {
      await exportUserData(db);
    } catch {
      Alert.alert(t('settings.exportFailed'), t('settings.exportFailedMsg'));
    }
  }, [db, t]);

  const handleDeleteData = useCallback(() => {
    Alert.alert(
      t('settings.deleteTitle'),
      t('settings.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteConfirm'),
          style: 'destructive',
          onPress: async () => {
            if (!db) return;
            try {
              await deleteAllUserData(db);
              await signOut();
              router.replace('/(auth)/language-detect');
            } catch {
              Alert.alert(t('common.error'), t('settings.deleteFailedMsg'));
            }
          },
        },
      ],
    );
  }, [db, router, t]);

  const handleSignOut = useCallback(() => {
    Alert.alert(t('common.signOut'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.signOut'),
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/language-detect');
        },
      },
    ]);
  }, [router, t]);

  const speedKeys = [
    { label: t('settings.slow'), value: 0.8 },
    { label: t('settings.normal'), value: 1.0 },
    { label: t('settings.fast'), value: 1.2 },
  ];
  const currentSpeedLabel = speedKeys.find((s) => s.value === voiceSpeed)?.label ?? t('settings.normal');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon size={20} color={colors.gold} />
          <Text style={[styles.backText, { color: colors.gold }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('settings.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('settings.account')}</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsRow
            icon={<GlobeIcon size={18} color={colors.textSecondary} />}
            label={t('settings.language')}
            value={language.native}
            colors={colors}
            onPress={() => setLanguageModalVisible(true)}
          />
          <SettingsToggleRow
            icon={<LockIcon size={18} color={colors.textSecondary} />}
            label={t('settings.biometricLock')}
            value={biometricEnabled}
            onToggle={handleBiometricToggle}
            colors={colors}
          />
          <SettingsToggleRow
            icon={<BellIcon size={18} color={colors.textSecondary} />}
            label={t('settings.notifications')}
            value={notificationsEnabled}
            onToggle={handleNotificationsToggle}
            colors={colors}
          />
          <SettingsRow
            icon={<LogOutIcon size={18} color={colors.textSecondary} />}
            label={t('common.signOut')}
            value=""
            colors={colors}
            onPress={handleSignOut}
          />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('settings.preferences')}</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsRow
            icon={<SpeakerIcon size={18} color={colors.textSecondary} />}
            label={t('settings.voiceSpeed')}
            value={currentSpeedLabel}
            colors={colors}
            onPress={() => setVoiceSpeedModalVisible(true)}
          />
          <SettingsRow
            icon={<UserIcon size={18} color={colors.textSecondary} />}
            label={t('settings.voiceGender')}
            value={voiceGender === 'female' ? t('settings.female') : t('settings.male')}
            colors={colors}
            onPress={() => setVoiceGenderModalVisible(true)}
          />
          <SettingsToggleRow
            icon={mode === 'dark'
              ? <MoonIcon size={18} color={colors.textSecondary} />
              : <SunIcon size={18} color={colors.textSecondary} />}
            label={mode === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
            value={mode === 'dark'}
            onToggle={() => toggle()}
            colors={colors}
          />
          <SettingsRow
            icon={<HeartIcon size={18} color={colors.textSecondary} />}
            label={t('healthProfile.title')}
            value=""
            colors={colors}
            onPress={() => router.push('/(app)/health-profile')}
          />
        </View>

        {/* Data & Privacy */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('settings.dataPrivacy')}</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsToggleRow
            icon={<WifiOffIcon size={18} color={colors.textSecondary} />}
            label={t('settings.offlineMode')}
            value={offlineMode}
            onToggle={handleOfflineModeToggle}
            colors={colors}
          />
          <SettingsRow
            icon={<DownloadIcon size={18} color={colors.textSecondary} />}
            label={t('settings.exportData')}
            value=""
            colors={colors}
            onPress={handleExport}
          />
          <SettingsRow
            icon={<TrashIcon size={18} color={colors.error} />}
            label={t('settings.deleteData')}
            value=""
            colors={colors}
            isDestructive
            onPress={handleDeleteData}
          />
          <SettingsRow
            icon={<ShieldCheckIcon size={18} color={colors.textSecondary} />}
            label={t('settings.privacyPolicy')}
            value=""
            colors={colors}
            onPress={() => router.push('/(app)/privacy-policy')}
          />
        </View>

        {/* Subscription */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>{t('subscription.title')}</Text>
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <SettingsRow
            icon={<StarIcon size={18} color={colors.gold} />}
            label={t('subscription.currentPlan')}
            value={t('subscription.freeTrial')}
            colors={colors}
            onPress={() => router.push('/(app)/subscription')}
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: colors.textTertiary }]}>{t('settings.appVersion')}</Text>
          <Text style={[styles.appInfoSubtext, { color: colors.textMuted }]}>{t('settings.madeInIndia')}</Text>
        </View>
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal visible={languageModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setLanguageModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('settings.selectLanguage')}</Text>
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
                    <CheckIcon size={18} color={colors.gold} />
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
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('settings.voiceSpeed')}</Text>
            {speedKeys.map((s) => (
              <Pressable
                key={s.label}
                style={[styles.modalRow, { borderBottomColor: colors.borderSubtle }]}
                onPress={() => handleVoiceSpeedSelect(s.value)}
              >
                <Text style={[styles.modalRowLabel, { color: colors.textPrimary }]}>{s.label}</Text>
                {s.value === voiceSpeed && (
                  <CheckIcon size={18} color={colors.gold} />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Voice Gender Modal */}
      <Modal visible={voiceGenderModalVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setVoiceGenderModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('settings.voiceGender')}</Text>
            {[{ label: t('settings.female'), value: 'female' }, { label: t('settings.male'), value: 'male' }].map((g) => (
              <Pressable
                key={g.value}
                style={[styles.modalRow, { borderBottomColor: colors.borderSubtle }]}
                onPress={() => handleVoiceGenderSelect(g.value)}
              >
                <Text style={[styles.modalRowLabel, { color: colors.textPrimary }]}>{g.label}</Text>
                {g.value === voiceGender && (
                  <CheckIcon size={18} color={colors.gold} />
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
  icon,
  label,
  value,
  colors,
  isDestructive,
  onPress,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  colors: Record<string, string>;
  isDestructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.row, { borderBottomColor: colors.borderSubtle }]} onPress={onPress}>
      <View style={styles.rowLeft}>
        {icon && <View style={styles.rowIcon}>{icon}</View>}
        <Text style={[styles.rowLabel, { color: isDestructive ? colors.error : colors.textPrimary }]}>
          {label}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text> : null}
        {onPress && <ChevronRightIcon size={16} color={colors.textMuted} />}
      </View>
    </Pressable>
  );
}

function SettingsToggleRow({
  icon,
  label,
  value,
  onToggle,
  colors,
}: {
  icon?: React.ReactNode;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  colors: Record<string, string>;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.borderSubtle }]}>
      <View style={styles.rowLeft}>
        {icon && <View style={styles.rowIcon}>{icon}</View>}
        <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      </View>
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
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { ...Typography.bodyMedium },
  title: { ...Typography.sectionHeader },
  content: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionLabel: { ...Typography.label, marginTop: 24, marginBottom: 8 },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, minHeight: 48,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowIcon: { width: 20, alignItems: 'center' },
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
});
