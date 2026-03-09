/**
 * Weekly Summary Cloud Function
 * Generates a personalized audio summary of the user's week.
 *
 * Flow: Firestore data -> Gemini summary text -> TTS audio -> Storage upload -> Firestore save
 * Triggered: Saturday night via scheduler OR on-demand via client call
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { defineString } from 'firebase-functions/params';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfigValues } from './remote-config';

const geminiApiKey = defineString('GEMINI_API_KEY');
const sarvamApiKey = defineString('SARVAM_API_KEY');
const googleCloudApiKey = defineString('GOOGLE_CLOUD_API_KEY');

const SARVAM_LANGUAGES = new Set([
  'hi-IN', 'ta-IN', 'te-IN', 'kn-IN', 'bn-IN',
  'mr-IN', 'gu-IN', 'ml-IN', 'pa-IN',
]);

const SUMMARY_PROMPT = `You are Maa, a warm voice health companion for women.
Generate a brief, caring weekly summary (3-5 sentences) based on the data below.
Speak directly to the user as "you". Be warm, encouraging, never clinical.
Never use emojis. Never diagnose. Highlight positives first, then gentle suggestions.
If data is sparse, acknowledge their effort and encourage more conversations next week.

Respond with JSON:
{
  "summaryText": "The spoken summary text",
  "insights": [
    { "title": "Short title", "detail": "One sentence detail", "domain": "mood|sleep|cycle|energy|score" }
  ]
}`;

/** On-demand: client requests their weekly summary */
export const generateWeeklySummary = onCall(
  { region: 'asia-south1', memory: '1GiB', timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    return generateSummaryForUser(request.auth.uid);
  },
);

/** Scheduled: runs every Saturday at 9PM IST (3:30PM UTC) for all users */
export const scheduledWeeklySummary = onSchedule(
  {
    schedule: 'every saturday 15:30',
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async () => {
    const db = getFirestore();
    // Get all users with a profile
    const usersSnap = await db.collectionGroup('profile').where('language', '!=', '').get();
    const uids = new Set<string>();
    for (const doc of usersSnap.docs) {
      const uid = doc.ref.parent.parent?.id;
      if (uid) uids.add(uid);
    }

    // Generate summaries in batches of 10
    const uidArray = Array.from(uids);
    for (let i = 0; i < uidArray.length; i += 10) {
      const batch = uidArray.slice(i, i + 10);
      await Promise.allSettled(batch.map((uid) => generateSummaryForUser(uid)));
    }
  },
);

async function generateSummaryForUser(uid: string): Promise<{
  summaryText: string;
  audioUrl: string;
  insights: Array<{ title: string; detail: string; domain: string }>;
  weekOf: string;
}> {
  const db = getFirestore();

  // Gather user data
  const [moodDoc, cycleDoc, scoreDoc, profileDoc] = await Promise.all([
    db.doc(`users/${uid}/anonymized_data/mood_summary`).get(),
    db.doc(`users/${uid}/anonymized_data/cycle_summary`).get(),
    db.doc(`users/${uid}/score/current`).get(),
    db.doc(`users/${uid}/profile/meta`).get(),
  ]);

  const moodData = moodDoc.exists ? moodDoc.data() : null;
  const cycleData = cycleDoc.exists ? cycleDoc.data() : null;
  const scoreData = scoreDoc.exists ? scoreDoc.data() : null;
  const profile = profileDoc.exists ? profileDoc.data() : null;
  const language = profile?.language ?? 'en';

  // Build data context for Gemini
  const dataContext: string[] = [];
  if (moodData?.avgMood) dataContext.push(`Average mood: ${moodData.avgMood}/5`);
  if (moodData?.avgEnergy) dataContext.push(`Average energy: ${moodData.avgEnergy}/5`);
  if (moodData?.avgSleep) dataContext.push(`Average sleep: ${moodData.avgSleep} hours`);
  if (moodData?.logCount) dataContext.push(`Days logged this month: ${moodData.logCount}`);
  if (cycleData?.totalCycles) dataContext.push(`Total cycles tracked: ${cycleData.totalCycles}`);
  if (cycleData?.avgCycleLength) dataContext.push(`Average cycle length: ${cycleData.avgCycleLength} days`);
  if (scoreData?.total) dataContext.push(`Maa Score: ${scoreData.total}/100`);

  // Generate summary text via Gemini (model + params from Remote Config)
  const config = await getConfigValues(['gemini_model', 'gemini_temperature', 'gemini_max_output_tokens']);
  const genAI = new GoogleGenerativeAI(geminiApiKey.value());
  const model = genAI.getGenerativeModel({
    model: config.gemini_model,
    generationConfig: {
      temperature: config.gemini_temperature,
      maxOutputTokens: config.gemini_max_output_tokens,
      responseMimeType: 'application/json',
    },
    systemInstruction: SUMMARY_PROMPT,
  });

  const languageNote = language !== 'en' ? `Respond in ${language} language.` : '';
  const prompt = dataContext.length > 0
    ? `Here is the user's data for this week:\n${dataContext.join('\n')}\n\n${languageNote}Generate their weekly summary.`
    : `The user is new and has very little data yet. ${languageNote}Generate an encouraging welcome summary for their first week.`;

  const geminiResult = await model.generateContent(prompt);
  const responseText = geminiResult.response.text();

  let summaryText: string;
  let insights: Array<{ title: string; detail: string; domain: string }>;

  try {
    const parsed = JSON.parse(responseText);
    summaryText = parsed.summaryText ?? responseText;
    insights = parsed.insights ?? [];
  } catch {
    summaryText = responseText;
    insights = [];
  }

  // Generate TTS audio
  let audioUrl = '';
  try {
    const audioBase64 = await generateTts(summaryText, language);
    audioUrl = await uploadAudioToStorage(uid, audioBase64);
  } catch (err) {
    console.warn('TTS generation failed, summary saved without audio:', err);
  }

  // Save to Firestore
  const weekOf = getWeekOfDate();
  await db.doc(`users/${uid}/weekly_summaries/${weekOf}`).set({
    summaryText,
    audioUrl,
    insights,
    weekOf,
    language,
    createdAt: new Date().toISOString(),
  });

  return { summaryText, audioUrl, insights, weekOf };
}

/** Generate TTS audio from text, returns base64 */
async function generateTts(text: string, language: string): Promise<string> {
  const sarvamCode = language === 'en' ? null : `${language}-IN`;
  const useSarvam = sarvamCode && SARVAM_LANGUAGES.has(sarvamCode);

  if (useSarvam) {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Subscription-Key': sarvamApiKey.value(),
      },
      body: JSON.stringify({
        input: { text },
        config: {
          language: { sourceLanguage: sarvamCode },
          gender: 'female',
          speakingRate: 0.9,
          audioFormat: 'wav',
          samplingRate: 16000,
        },
      }),
    });
    if (!response.ok) throw new Error(`Sarvam TTS: ${response.status}`);
    const result = await response.json() as { output: { audio: { base64: string } } };
    return result.output?.audio?.base64 ?? '';
  } else {
    const langCode = language === 'en' ? 'en-IN' : `${language}-IN`;
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleCloudApiKey.value()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: langCode, ssmlGender: 'FEMALE' },
          audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9 },
        }),
      },
    );
    if (!response.ok) throw new Error(`Google TTS: ${response.status}`);
    const result = await response.json() as { audioContent: string };
    return result.audioContent ?? '';
  }
}

/** Upload audio to Firebase Storage, returns public URL */
async function uploadAudioToStorage(uid: string, audioBase64: string): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket();
  const weekOf = getWeekOfDate();
  const filePath = `weekly_summaries/${uid}/${weekOf}.mp3`;
  const file = bucket.file(filePath);

  const buffer = Buffer.from(audioBase64, 'base64');
  await file.save(buffer, { contentType: 'audio/mpeg' });
  await file.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`;
}

function getWeekOfDate(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}
