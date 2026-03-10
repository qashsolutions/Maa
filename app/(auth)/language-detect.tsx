import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { SUPPORTED_LANGUAGES, Language, languageFromLocale } from '../../constants/languages';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';
import * as Localization from 'expo-localization';

export default function LanguageDetectScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Auto-detect from device locale on mount (instant, no permission needed)
  useEffect(() => {
    try {
      const locales = Localization.getLocales();
      if (locales.length > 0) {
        const detected = languageFromLocale(locales[0].languageTag);
        setSelectedCode(detected);
        setLanguage(detected);
      }
    } catch {
      // Fall through to manual selection — English is visual default
    }
  }, [setLanguage]);

  function handleSelect(lang: Language) {
    setSelectedCode(lang.code);
    setLanguage(lang.code);
  }

  function handleContinue() {
    if (selectedCode) {
      router.push('/(auth)/age-confirm');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{t('auth.chooseLanguage')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('auth.maaWillSpeak')}
        </Text>
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
