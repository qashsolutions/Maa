import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { SUPPORTED_LANGUAGES, Language } from '../../constants/languages';
import { useLanguage } from '../../contexts/LanguageContext';
import { detectLanguageFromLocation } from '../../lib/auth/location-language';

export default function LanguageDetectScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setLanguage } = useLanguage();
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>Choose your language</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Maa will speak to you in your language
        </Text>
        {detecting && (
          <View style={styles.detectingRow}>
            <ActivityIndicator size="small" color={colors.gold} />
            <Text style={[styles.detectingText, { color: colors.textTertiary }]}>
              Detecting from your location...
            </Text>
          </View>
        )}
        {detectedState && !detecting && (
          <Text style={[styles.detectedText, { color: colors.gold }]}>
            Detected: {detectedState}
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
        <Text style={[styles.buttonText, { color: colors.bgPrimary }]}>Continue</Text>
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
  detectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
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
