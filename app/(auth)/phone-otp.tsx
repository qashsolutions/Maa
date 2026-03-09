import { useState, useRef } from 'react';
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
import { useTheme } from '../../contexts/ThemeContext';
import { Typography } from '../../constants/typography';

export default function PhoneOtpScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [phone, setPhone] = useState('');
  const [countryCode] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  async function handleSendOtp() {
    if (phone.length < 10) {
      Alert.alert('Invalid number', 'Please enter a valid 10-digit phone number');
      return;
    }
    setIsLoading(true);
    // TODO: Integrate Firebase phone auth
    // const confirmation = await signInWithPhoneNumber(auth, `${countryCode}${phone}`);
    setOtpSent(true);
    setCountdown(30);
    setIsLoading(false);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
    // TODO: Integrate Firebase OTP verification
    // await confirmationResult.confirm(code);
    router.push('/(auth)/face-id-setup');
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
              Enter your phone number
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              We will send you a verification code
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
              placeholder="Phone number"
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
              {isLoading ? 'Sending...' : 'Send OTP'}
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
            Verify your number
          </Text>
          <View style={styles.phoneDisplay}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Code sent to {countryCode} {phone}
            </Text>
            <Pressable onPress={() => setOtpSent(false)}>
              <Text style={[styles.editLink, { color: colors.gold }]}>Edit</Text>
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
            Resend code in {countdown}s
          </Text>
        ) : (
          <Pressable onPress={handleSendOtp}>
            <Text style={[styles.resendLink, { color: colors.gold }]}>Resend code</Text>
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
