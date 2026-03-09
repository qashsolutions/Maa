/**
 * BiometricGate - Locked overlay shown when app returns to foreground
 * and biometric lock is enabled. Covers the entire screen with a dimmed
 * background until the user passes biometric authentication.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, AppState, Pressable, type AppStateStatus } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { authenticateWithBiometric, isBiometricEnabled } from '../lib/auth/biometric';

export function BiometricGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [locked, setLocked] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const isAuthenticating = useRef(false);

  const promptBiometric = useCallback(async () => {
    if (isAuthenticating.current) return;
    isAuthenticating.current = true;
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        setLocked(false);
      }
      // If it fails, stay locked -- user can tap "Unlock" to retry
    } catch {
      // Biometric not available or cancelled -- stay locked
    } finally {
      isAuthenticating.current = false;
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      // App came to foreground from background/inactive
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        if (isBiometricEnabled()) {
          setLocked(true);
          promptBiometric();
        }
      }
      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, [promptBiometric]);

  return (
    <View style={styles.container}>
      {children}
      {locked && (
        <View style={[styles.overlay, { backgroundColor: colors.bgPrimary }]}>
          <View style={[styles.lockIcon, { borderColor: colors.gold }]}>
            <Text style={[styles.lockEmoji, { color: colors.gold }]}>
              {/* SVG icon would go here -- using a simple lock character for now */}
              {'{ }'}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Maa is Locked
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Authenticate to continue
          </Text>
          <Pressable
            style={[styles.unlockButton, { backgroundColor: colors.gold }]}
            onPress={promptBiometric}
          >
            <Text style={styles.unlockButtonText}>Unlock</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  lockIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockEmoji: {
    fontSize: 24,
    fontFamily: 'DMSans-Bold',
  },
  title: {
    fontSize: 23,
    fontFamily: 'PlayfairDisplay-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'DMSans-Regular',
    marginBottom: 32,
  },
  unlockButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 160,
    alignItems: 'center',
  },
  unlockButtonText: {
    fontSize: 16,
    fontFamily: 'DMSans-SemiBold',
    color: '#FFFFFF',
  },
});
