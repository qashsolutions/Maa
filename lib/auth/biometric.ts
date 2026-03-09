/**
 * Biometric authentication wrapper using expo-local-authentication.
 * Used for app-level lock (not auth — that's Firebase Phone OTP).
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { getBoolean, setBoolean, StorageKeys } from '../utils/storage';

/** Check if device supports biometric auth */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/** Get the type of biometric available (fingerprint, face, etc.) */
export async function getBiometricType(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biometric';
}

/** Prompt user for biometric authentication */
export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Maa',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false, // Allow PIN/pattern as fallback
  });

  return result.success;
}

/** Check if biometric lock is enabled by the user */
export function isBiometricEnabled(): boolean {
  return getBoolean(StorageKeys.BIOMETRIC_ENABLED);
}

/** Enable/disable biometric lock */
export function setBiometricEnabled(enabled: boolean): void {
  setBoolean(StorageKeys.BIOMETRIC_ENABLED, enabled);
}
