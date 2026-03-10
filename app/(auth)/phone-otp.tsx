import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Localization from 'expo-localization';
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';
import { sendOtp, verifyOtp } from '../../lib/auth/phone-auth';
import { useTranslation } from '../../hooks/useTranslation';

/** Map common region codes to dial prefixes */
const REGION_DIAL_CODES: Record<string, string> = {
  US: '+1', CA: '+1', GB: '+44', AU: '+61', IN: '+91',
  MX: '+52', BR: '+55', DE: '+49', FR: '+33', JP: '+81',
  CN: '+86', KR: '+82', SG: '+65', AE: '+971', ZA: '+27',
  NG: '+234', KE: '+254', PH: '+63', ID: '+62', BD: '+880',
  PK: '+92', ES: '+34', IT: '+39', NL: '+31', SE: '+46',
};

function detectCountryCode(): string {
  try {
    const locales = Localization.getLocales();
    if (locales.length > 0 && locales[0].regionCode) {
      return REGION_DIAL_CODES[locales[0].regionCode] ?? '+1';
    }
  } catch { /* fallback */ }
  return '+1';
}

export default function PhoneOtpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    setCountryCode(detectCountryCode());
  }, []);

  async function handleSendOtp() {
    if (phone.length < 10) {
      Alert.alert(t('auth.invalidNumber'), t('auth.invalidNumberMsg'));
      return;
    }
    setIsLoading(true);
    try {
      const success = await sendOtp(`${countryCode}${phone}`);
      if (success) {
        setOtpSent(true);
        setCountdown(30);
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        Alert.alert(t('common.error'), t('auth.otpFailed'));
      }
    } catch {
      Alert.alert(t('common.error'), t('auth.somethingWrong'));
    }
    setIsLoading(false);
  }

  function handleOtpChange(value: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 3) {
      otpRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d) && newOtp.join('').length === 4) {
      handleVerifyOtp(newOtp.join(''));
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyOtp(code: string) {
    setIsLoading(true);
    try {
      const success = await verifyOtp(code);
      if (success) {
        router.push('/(auth)/face-id-setup');
      } else {
        Alert.alert(t('auth.invalidCode'), t('auth.invalidCodeMsg'));
        setOtp(['', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch {
      Alert.alert(t('common.error'), t('auth.verifyFailed'));
    }
    setIsLoading(false);
  }

  if (!otpSent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('auth.enterPhone')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('auth.sendVerification')}
            </Text>
          </View>

          <View style={styles.phoneRow}>
            <View style={[styles.countryCode, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault }]}>
              <Text style={[styles.countryCodeText, { color: colors.textPrimary }]}>
                {countryCode}
              </Text>
            </View>
            <TextInput
              style={[styles.phoneInput, { backgroundColor: colors.bgCard, borderColor: colors.borderDefault, color: colors.textPrimary }]}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth.phonePlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
            />
          </View>

          <Pressable
            style={[styles.button, { backgroundColor: colors.gold }, (phone.length < 10 || isLoading) && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={phone.length < 10 || isLoading}
          >
            <Text style={[styles.buttonText, { color: colors.bgPrimary }]}>
              {isLoading ? t('auth.sending') : t('auth.sendOtp')}
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {t('auth.verifyNumber')}
          </Text>
          <View style={styles.phoneDisplay}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('auth.codeSentTo', { phone: `${countryCode} ${phone}` })}
            </Text>
            <Pressable onPress={() => setOtpSent(false)}>
              <Text style={[styles.editLink, { color: colors.gold }]}>{t('auth.edit')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => { otpRefs.current[index] = ref; }}
              style={[
                styles.otpBox,
                { borderColor: colors.borderDefault, backgroundColor: colors.bgCard, color: colors.textPrimary },
                digit ? { borderColor: colors.gold } : null,
              ]}
              value={digit}
              onChangeText={(v) => handleOtpChange(v, index)}
              onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, index)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={index === 0}
            />
          ))}
        </View>

        {countdown > 0 ? (
          <Text style={[styles.countdown, { color: colors.textTertiary }]}>
            {t('auth.resendIn', { seconds: countdown })}
          </Text>
        ) : (
          <Pressable onPress={handleSendOtp}>
            <Text style={[styles.resendLink, { color: colors.gold }]}>{t('auth.resendCode')}</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  countryCode: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  countryCodeText: {
    ...Typography.cardTitle,
  },
  phoneInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Typography.cardTitle,
    fontSize: 18,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...Typography.cardTitle,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editLink: {
    ...Typography.bodyMedium,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  otpBox: {
    width: 72,
    height: 80,
    borderRadius: 20,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 28,
    fontFamily: 'DMSans-Bold',
  },
  countdown: {
    ...Typography.body,
    textAlign: 'center',
  },
  resendLink: {
    ...Typography.bodyMedium,
    textAlign: 'center',
  },
});
