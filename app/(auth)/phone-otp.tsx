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
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function PhoneOtpScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [countryCode] = useState('+91');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
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

    // Start countdown
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

    // Auto-advance to next box
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all filled
    if (newOtp.every((d) => d) && newOtp.join('').length === 6) {
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
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Enter your phone number</Text>
            <Text style={styles.subtitle}>
              We will send you a verification code
            </Text>
          </View>

          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>{countryCode}</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone number"
              placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
            />
          </View>

          <Pressable
            style={[styles.button, (phone.length < 10 || isLoading) && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={phone.length < 10 || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Sending...' : 'Send OTP'}
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Verify your number</Text>
          <View style={styles.phoneDisplay}>
            <Text style={styles.subtitle}>
              Code sent to {countryCode} {phone}
            </Text>
            <Pressable onPress={() => setOtpSent(false)}>
              <Text style={styles.editLink}>Edit</Text>
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
                digit ? styles.otpBoxFilled : null,
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
          <Text style={styles.countdown}>Resend code in {countdown}s</Text>
        ) : (
          <Pressable onPress={handleSendOtp}>
            <Text style={styles.resendLink}>Resend code</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPrimary,
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
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  countryCode: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  countryCodeText: {
    ...Typography.cardTitle,
    color: Colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Typography.cardTitle,
    color: Colors.textPrimary,
    fontSize: 18,
  },
  button: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...Typography.cardTitle,
    color: Colors.bgPrimary,
  },
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editLink: {
    ...Typography.bodyMedium,
    color: Colors.gold,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  otpBox: {
    width: 52,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgCard,
    textAlign: 'center',
    fontSize: 24,
    color: Colors.textPrimary,
    fontFamily: 'DMSans-Bold',
  },
  otpBoxFilled: {
    borderColor: Colors.gold,
  },
  countdown: {
    ...Typography.body,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  resendLink: {
    ...Typography.bodyMedium,
    color: Colors.gold,
    textAlign: 'center',
  },
});
