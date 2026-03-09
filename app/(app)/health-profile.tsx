import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { useDatabase } from '../../contexts/DatabaseContext';
import { Typography } from '../../constants/typography';
import { useTranslation } from '../../hooks/useTranslation';
import {
  ChevronLeftIcon, HeartIcon, CheckIcon, CloseIcon,
} from '../../icons';

type PregnancyStatus = 'not_pregnant' | 'pregnant' | 'trying';

interface HealthProfileData {
  cycleLength: number;
  conditions: string[];
  medications: string[];
  pregnancyStatus: PregnancyStatus;
}

export default function HealthProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { db } = useDatabase();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<HealthProfileData>({
    cycleLength: 28,
    conditions: [],
    medications: [],
    pregnancyStatus: 'not_pregnant',
  });
  const [newCondition, setNewCondition] = useState('');
  const [newMedication, setNewMedication] = useState('');
  const [showConditionInput, setShowConditionInput] = useState(false);
  const [showMedicationInput, setShowMedicationInput] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = useCallback(async () => {
    if (!db) return;
    const row = await db.getFirstAsync<{
      cycle_length_avg: number | null;
      conditions: string | null;
      medications: string | null;
      pregnancy_status: string | null;
    }>('SELECT cycle_length_avg, conditions, medications, pregnancy_status FROM user_profile LIMIT 1');
    if (row) {
      setProfile({
        cycleLength: row.cycle_length_avg ?? 28,
        conditions: row.conditions ? JSON.parse(row.conditions) : [],
        medications: row.medications ? JSON.parse(row.medications) : [],
        pregnancyStatus: (row.pregnancy_status as PregnancyStatus) ?? 'not_pregnant',
      });
    }
  }, [db]);

  const saveProfile = useCallback(async (updated: HealthProfileData) => {
    if (!db) return;
    await db.runAsync(
      `UPDATE user_profile SET cycle_length_avg = ?, conditions = ?, medications = ?, pregnancy_status = ? WHERE rowid = 1`,
      [
        updated.cycleLength,
        JSON.stringify(updated.conditions),
        JSON.stringify(updated.medications),
        updated.pregnancyStatus,
      ],
    );
  }, [db]);

  function updateAndSave(changes: Partial<HealthProfileData>) {
    const updated = { ...profile, ...changes };
    setProfile(updated);
    saveProfile(updated);
  }

  function addCondition() {
    const trimmed = newCondition.trim();
    if (!trimmed) return;
    updateAndSave({ conditions: [...profile.conditions, trimmed] });
    setNewCondition('');
    setShowConditionInput(false);
  }

  function removeCondition(index: number) {
    updateAndSave({ conditions: profile.conditions.filter((_, i) => i !== index) });
  }

  function addMedication() {
    const trimmed = newMedication.trim();
    if (!trimmed) return;
    updateAndSave({ medications: [...profile.medications, trimmed] });
    setNewMedication('');
    setShowMedicationInput(false);
  }

  function removeMedication(index: number) {
    updateAndSave({ medications: profile.medications.filter((_, i) => i !== index) });
  }

  function adjustCycleLength(delta: number) {
    const next = Math.max(18, Math.min(45, profile.cycleLength + delta));
    updateAndSave({ cycleLength: next });
  }

  const pregnancyOptions: { value: PregnancyStatus; labelKey: string }[] = [
    { value: 'not_pregnant', labelKey: 'healthProfile.notPregnant' },
    { value: 'trying', labelKey: 'healthProfile.tryingToConceive' },
    { value: 'pregnant', labelKey: 'healthProfile.pregnant' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <ChevronLeftIcon size={20} color={colors.gold} />
          <Text style={[styles.backText, { color: colors.gold }]}>{t('common.back')}</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('healthProfile.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Cycle Length */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          {t('healthProfile.cycleLength')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          <View style={styles.cycleLengthRow}>
            <Pressable
              style={[styles.cycleBtn, { borderColor: colors.borderDefault }]}
              onPress={() => adjustCycleLength(-1)}
              hitSlop={8}
            >
              <Text style={[styles.cycleBtnText, { color: colors.textPrimary }]}>-</Text>
            </Pressable>
            <View style={styles.cycleLengthCenter}>
              <Text style={[styles.cycleLengthValue, { color: colors.gold }]}>
                {profile.cycleLength}
              </Text>
              <Text style={[styles.cycleLengthUnit, { color: colors.textSecondary }]}>
                {t('healthProfile.cycleLengthDays', { days: '' }).trim()}
              </Text>
            </View>
            <Pressable
              style={[styles.cycleBtn, { borderColor: colors.borderDefault }]}
              onPress={() => adjustCycleLength(1)}
              hitSlop={8}
            >
              <Text style={[styles.cycleBtnText, { color: colors.textPrimary }]}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* Pregnancy Status */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          {t('healthProfile.pregnancyStatus')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          {pregnancyOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.optionRow,
                { borderBottomColor: colors.borderSubtle },
              ]}
              onPress={() => updateAndSave({ pregnancyStatus: opt.value })}
            >
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                {t(opt.labelKey)}
              </Text>
              {profile.pregnancyStatus === opt.value && (
                <CheckIcon size={18} color={colors.gold} />
              )}
            </Pressable>
          ))}
        </View>

        {/* Conditions */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          {t('healthProfile.conditions')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          {profile.conditions.length === 0 && !showConditionInput && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('healthProfile.none')}</Text>
          )}
          {profile.conditions.map((c, i) => (
            <View key={i} style={[styles.tagRow, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.tagText, { color: colors.textPrimary }]}>{c}</Text>
              <Pressable onPress={() => removeCondition(i)} hitSlop={8}>
                <CloseIcon size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
          ))}
          {showConditionInput ? (
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderGold }]}
                value={newCondition}
                onChangeText={setNewCondition}
                placeholder={t('healthProfile.conditionPlaceholder')}
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={addCondition}
                autoFocus
              />
              <Pressable onPress={addCondition} hitSlop={8}>
                <CheckIcon size={20} color={colors.gold} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowConditionInput(true)} style={styles.addBtn}>
              <Text style={[styles.addBtnText, { color: colors.gold }]}>
                + {t('healthProfile.addCondition')}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Medications */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
          {t('healthProfile.medications')}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
          {profile.medications.length === 0 && !showMedicationInput && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('healthProfile.none')}</Text>
          )}
          {profile.medications.map((m, i) => (
            <View key={i} style={[styles.tagRow, { borderBottomColor: colors.borderSubtle }]}>
              <Text style={[styles.tagText, { color: colors.textPrimary }]}>{m}</Text>
              <Pressable onPress={() => removeMedication(i)} hitSlop={8}>
                <CloseIcon size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
          ))}
          {showMedicationInput ? (
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.textInput, { color: colors.textPrimary, borderColor: colors.borderGold }]}
                value={newMedication}
                onChangeText={setNewMedication}
                placeholder={t('healthProfile.medicationPlaceholder')}
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={addMedication}
                autoFocus
              />
              <Pressable onPress={addMedication} hitSlop={8}>
                <CheckIcon size={20} color={colors.gold} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setShowMedicationInput(true)} style={styles.addBtn}>
              <Text style={[styles.addBtnText, { color: colors.gold }]}>
                + {t('healthProfile.addMedication')}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cycleLengthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24,
  },
  cycleBtn: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },
  cycleBtnText: { fontSize: 24, fontFamily: 'DMSans-Medium' },
  cycleLengthCenter: { alignItems: 'center' },
  cycleLengthValue: { fontSize: 48, fontFamily: 'PlayfairDisplay-Bold' },
  cycleLengthUnit: { ...Typography.caption, marginTop: 4 },
  optionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, minHeight: 48,
  },
  optionLabel: { ...Typography.body },
  emptyText: { ...Typography.body, paddingVertical: 8 },
  tagRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1,
  },
  tagText: { ...Typography.body, flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
  textInput: {
    flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    ...Typography.body,
  },
  addBtn: { paddingVertical: 12 },
  addBtnText: { ...Typography.bodyMedium },
});
