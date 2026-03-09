/**
 * Location-based language auto-detection.
 * Uses expo-location to get coordinates, reverse geocodes to Indian state,
 * maps state to likely language.
 */
import * as Location from 'expo-location';
import { STATE_LANGUAGE_MAP, DEFAULT_LANGUAGE } from '../../constants/languages';

interface LocationResult {
  languageCode: string;
  state: string | null;
  permissionGranted: boolean;
}

/** Try to detect language from user's location */
export async function detectLanguageFromLocation(): Promise<LocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { languageCode: DEFAULT_LANGUAGE.code, state: null, permissionGranted: false };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low, // Fast, low battery — we just need the state
    });

    const [address] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    if (!address?.region) {
      return { languageCode: DEFAULT_LANGUAGE.code, state: null, permissionGranted: true };
    }

    const state = address.region;
    const languageCode = STATE_LANGUAGE_MAP[state] ?? DEFAULT_LANGUAGE.code;

    return { languageCode, state, permissionGranted: true };
  } catch (error) {
    console.warn('Location detection failed:', error);
    return { languageCode: DEFAULT_LANGUAGE.code, state: null, permissionGranted: false };
  }
}
