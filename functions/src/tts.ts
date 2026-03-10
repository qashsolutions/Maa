/**
 * Text-to-Speech Cloud Function
 * Routes to Sarvam AI (Indian languages) or Google Cloud TTS (others).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';

const sarvamApiKey = defineString('SARVAM_API_KEY');
const googleCloudApiKey = defineString('GOOGLE_CLOUD_API_KEY');

const SARVAM_LANGUAGES = new Set([
  'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN',
  'mr-IN', 'gu-IN', 'ml-IN', 'pa-IN',
]);

export const voiceTts = onCall(
  { region: 'asia-south1', memory: '512MiB', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { text, language, gender, speed, pitch } = request.data as {
      text: string;
      language: string;
      gender: string;
      speed: number;
      pitch?: number; // -20 to 20 semitones (Google TTS), default 0
    };

    if (!text || !language) {
      throw new HttpsError('invalid-argument', 'text and language are required');
    }

    const sarvamCode = language === 'en' ? null : `${language}-IN`;
    const useSarvam = sarvamCode && SARVAM_LANGUAGES.has(sarvamCode);

    // Clamp speed to valid range (0.25 - 4.0)
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed ?? 1.0));
    // Clamp pitch to valid range (-20 to 20 semitones)
    const clampedPitch = Math.max(-20, Math.min(20, pitch ?? 0));

    if (useSarvam) {
      return { audio: await sarvamTts(text, sarvamCode, gender, clampedSpeed, sarvamApiKey.value()) };
    } else {
      return { audio: await googleTts(text, language, gender, clampedSpeed, clampedPitch, googleCloudApiKey.value()) };
    }
  },
);

async function sarvamTts(
  text: string,
  languageCode: string,
  gender: string,
  speed: number,
  apiKey: string,
): Promise<string> {
  const response = await fetch('https://api.sarvam.ai/text-to-speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Subscription-Key': apiKey,
    },
    body: JSON.stringify({
      input: { text },
      config: {
        language: { sourceLanguage: languageCode },
        gender: gender === 'male' ? 'male' : 'female',
        speakingRate: speed,
        audioFormat: 'wav',
        samplingRate: 16000,
      },
    }),
  });

  if (!response.ok) {
    throw new HttpsError('internal', `Sarvam TTS failed: ${response.status}`);
  }

  const result = await response.json() as { output: { audio: { base64: string } } };
  return result.output?.audio?.base64 ?? '';
}

async function googleTts(
  text: string,
  languageCode: string,
  gender: string,
  speed: number,
  pitch: number,
  apiKey: string,
): Promise<string> {
  const langCode = languageCode === 'en' ? 'en-IN' : `${languageCode}-IN`;

  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: langCode,
          ssmlGender: gender === 'male' ? 'MALE' : 'FEMALE',
        },
        audioConfig: {
          audioEncoding: 'LINEAR16',
          sampleRateHertz: 16000,
          speakingRate: speed,
          pitch,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new HttpsError('internal', `Google TTS failed: ${response.status}`);
  }

  const result = await response.json() as { audioContent: string };
  return result.audioContent ?? '';
}
