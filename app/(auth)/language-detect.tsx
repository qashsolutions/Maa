import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { SUPPORTED_LANGUAGES, Language } from '../../constants/languages';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LanguageDetectScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { setLanguage } = useLanguage();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.subtitle}>
          Maa will speak to you in your language
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
              style={[styles.langCard, isSelected && styles.langCardSelected]}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.script}>{item.script}</Text>
              <Text style={styles.nativeName}>{item.native}</Text>
              <Text style={styles.englishName}>{item.name}</Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={[styles.button, !selectedCode && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={!selectedCode}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    ...Typography.sectionHeader,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    alignItems: 'center',
  },
  langCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.bgGoldSubtle,
  },
  script: {
    fontSize: 32,
    color: Colors.gold,
    marginBottom: 8,
  },
  nativeName: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  englishName: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  button: {
    backgroundColor: Colors.gold,
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
    color: Colors.bgPrimary,
  },
});
