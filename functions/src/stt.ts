/**
 * Speech-to-Text Cloud Function
 * Routes to Sarvam AI (Indian languages) or Google Cloud STT (others).
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';

const sarvamApiKey = defineString('SARVAM_API_KEY');
const googleCloudApiKey = defineString('GOOGLE_CLOUD_API_KEY');

// Indian language codes that use Sarvam AI
const SARVAM_LANGUAGES = new Set([
  'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN',
  'mr-IN', 'gu-IN', 'ml-IN', 'pa-IN',
]);

export const voiceStt = onCall(
  { region: 'asia-south1', memory: '512MiB', timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { audio, language } = request.data as { audio: string; language: string };
    if (!audio || !language) {
      throw new HttpsError('invalid-argument', 'audio and language are required');
    }

    // Map language code to Sarvam code
    const sarvamCode = language === 'en' ? null : `${language}-IN`;
    const useSarvam = sarvamCode && SARVAM_LANGUAGES.has(sarvamCode);

    if (useSarvam) {
      return { text: await sarvamStt(audio, sarvamCode, sarvamApiKey.value()) };
    } else {
      return { text: await googleStt(audio, language, googleCloudApiKey.value()) };
    }
  },
);

async function sarvamStt(audioBase64: string, languageCode: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.sarvam.ai/speech-to-text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Subscription-Key': apiKey,
    },
    body: JSON.stringify({
      input: { audio: { base64: audioBase64 } },
      config: {
        language: { sourceLanguage: languageCode },
        audioFormat: 'wav',
        samplingRate: 16000,
      },
    }),
  });

  if (!response.ok) {
    throw new HttpsError('internal', `Sarvam STT failed: ${response.status}`);
  }

  const result = await response.json() as { output: Array<{ source: string }> };
  return result.output?.[0]?.source ?? '';
}

async function googleStt(audioBase64: string, languageCode: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: languageCode === 'en' ? 'en-IN' : `${languageCode}-IN`,
          model: 'latest_long',
        },
        audio: { content: audioBase64 },
      }),
    },
  );

  if (!response.ok) {
    throw new HttpsError('internal', `Google STT failed: ${response.status}`);
  }

  const result = await response.json() as {
    results?: Array<{ alternatives?: Array<{ transcript: string }> }>;
  };
  return result.results?.[0]?.alternatives?.[0]?.transcript ?? '';
}
