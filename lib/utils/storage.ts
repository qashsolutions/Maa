import { createMMKV, type MMKV } from 'react-native-mmkv';

let _storage: MMKV | null = null;

function getStorage(): MMKV {
  if (!_storage) {
    _storage = createMMKV({
      id: 'maa-storage',
      encryptionKey: 'maa-health-v1',
    });
  }
  return _storage;
}

// Type-safe storage keys
export const StorageKeys = {
  LANGUAGE_CODE: 'language_code',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  VOICE_SPEED: 'voice_speed',
  VOICE_GENDER: 'voice_gender',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  OFFLINE_MODE: 'offline_mode',
  CACHED_SCORE: 'cached_score',
  LAST_SYNC_AT: 'last_sync_at',
  FCM_TOKEN: 'fcm_token',
  COUNTRY_CODE: 'country_code',
} as const;

// Helpers
export function getString(key: string): string | undefined {
  return getStorage().getString(key);
}

export function setString(key: string, value: string): void {
  getStorage().set(key, value);
}

export function getBoolean(key: string): boolean {
  return getStorage().getBoolean(key) ?? false;
}

export function setBoolean(key: string, value: boolean): void {
  getStorage().set(key, value);
}

export function getNumber(key: string): number | undefined {
  const val = getStorage().getString(key);
  return val ? Number(val) : undefined;
}

export function clearAll(): void {
  getStorage().clearAll();
}
