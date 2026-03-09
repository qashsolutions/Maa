/**
 * Push Notifications Cloud Functions
 *
 * - Sunday 7PM IST: Weekly summary notification
 * - Proactive: Period prediction, missed logging, streak reminders
 * - All via Firebase Cloud Messaging (FCM)
 */
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

/** Sunday 7PM IST summary notification — tells users their summary is ready */
export const sundaySummaryNotification = onSchedule(
  {
    schedule: 'every sunday 13:30', // 7PM IST = 1:30PM UTC
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '256MiB',
    timeoutSeconds: 120,
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();

    // Get all users with FCM tokens
    const profilesSnap = await db.collectionGroup('profile')
      .where('fcmToken', '!=', null)
      .get();

    const messages: Array<{ token: string; notification: { title: string; body: string }; data: Record<string, string> }> = [];

    for (const doc of profilesSnap.docs) {
      const data = doc.data();
      const token = data.fcmToken;
      if (!token) continue;

      const language = data.language ?? 'en';
      const { title, body } = getSummaryNotificationText(language);

      messages.push({
        token,
        notification: { title, body },
        data: { type: 'weekly_summary', screen: 'summary' },
      });
    }

    // Send in batches of 500 (FCM limit)
    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      await messaging.sendEach(batch);
    }

    console.log(`Sent ${messages.length} summary notifications`);
  },
);

/** Proactive notifications — runs daily at 10AM IST */
export const dailyProactiveNotifications = onSchedule(
  {
    schedule: 'every day 04:30', // 10AM IST = 4:30AM UTC
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const messages: Array<{ token: string; notification: { title: string; body: string }; data: Record<string, string> }> = [];

    const profilesSnap = await db.collectionGroup('profile')
      .where('fcmToken', '!=', null)
      .get();

    for (const doc of profilesSnap.docs) {
      const data = doc.data();
      const token = data.fcmToken;
      if (!token) continue;

      const uid = doc.ref.parent.parent?.id;
      if (!uid) continue;

      const language = data.language ?? 'en';

      // Check cycle data for period prediction
      const cycleDoc = await db.doc(`users/${uid}/anonymized_data/cycle_summary`).get();
      const cycleData = cycleDoc.exists ? cycleDoc.data() : null;

      if (cycleData?.avgCycleLength) {
        // Period prediction notification (3 days before)
        const notification = getPeriodPredictionNotification(cycleData, language);
        if (notification) {
          messages.push({
            token,
            notification: { title: notification.title, body: notification.body },
            data: { type: 'period_prediction', screen: 'home' },
          });
          continue; // One notification per user per day
        }
      }

      // Streak reminder — if user hasn't logged this week
      const scoreDoc = await db.doc(`users/${uid}/score/current`).get();
      const scoreData = scoreDoc.exists ? scoreDoc.data() : null;

      if (scoreData && scoreData.consistency < 10) {
        const { title, body } = getStreakReminderText(language);
        messages.push({
          token,
          notification: { title, body },
          data: { type: 'streak_reminder', screen: 'home' },
        });
      }
    }

    // Send in batches
    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      await messaging.sendEach(batch);
    }

    console.log(`Sent ${messages.length} proactive notifications`);
  },
);

// --- Notification text helpers (multi-language) ---

function getSummaryNotificationText(language: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    en: { title: 'Your Weekly Summary is Ready', body: 'Maa has prepared your health insights for this week. Tap to listen.' },
    hi: { title: 'Aapka Weekly Summary Taiyaar Hai', body: 'Maa ne aapke liye is hafte ki health insights taiyaar ki hain. Sunne ke liye tap karein.' },
    ta: { title: 'Unga Vaara Surukkam Thayar', body: 'Maa ungal aarogya vivrangalai thayar seithirukkiraar. Ketkka tap seyyungal.' },
    te: { title: 'Mee Vaara Sarangsham Siddhanga Undi', body: 'Maa mee aarogyam gurinchi ee vaaram insights tayyaru chesindi. Vinataniki tap cheyandi.' },
    bn: { title: 'Apnar Saptahik Sarangsho Toiri', body: 'Maa apnar ei saptaher swasthya bishleshan toiri koreche. Shunte tap korun.' },
    mr: { title: 'Tumcha Saptahik Saransh Tayar Ahe', body: 'Maa ne tumchya ya aathavdyacha arogya maahiti tayar keli aahe. Aiknyasathi tap kara.' },
    kn: { title: 'Nimma Varada Saramsham Siddhavagide', body: 'Maa nimma ee vaarada aarogya vishleshanegalannu siddhapadisiddaare. Kelalu tap maadi.' },
    gu: { title: 'Tamaru Saptahik Saransh Taiyar Chhe', body: 'Maa e tamara aa ahevadana arogya mahiti taiyar kari chhe. Sambhaldva mate tap karo.' },
    ml: { title: 'Ningalude Aazhcha Samgraham Thayar', body: 'Maa ningalude ee aazhchayile aarogya vishakalanam thayaraakkiyirikkunnu. Kelkkaan tap cheyyuka.' },
    pa: { title: 'Tuhaada Haftewaara Summary Taiyaar Hai', body: 'Maa ne tuhaade lyi is hafte di health insights taiyaar kiti hain. Sunnan layi tap karo.' },
  };
  return texts[language] ?? texts.en;
}

function getStreakReminderText(language: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    en: { title: 'Maa misses you', body: 'A quick chat keeps your streak alive. Tap to talk.' },
    hi: { title: 'Maa ko tumhari yaad aa rahi hai', body: 'Ek chhoti si baat tumhari streak ko banaye rakhegi. Baat karne ke liye tap karo.' },
  };
  return texts[language] ?? texts.en;
}

function getPeriodPredictionNotification(
  cycleData: FirebaseFirestore.DocumentData,
  language: string,
): { title: string; body: string } | null {
  // Simple heuristic: if avg cycle is known, predict ~3 days before
  // In production, this would use the actual last period start date
  const avgLength = cycleData.avgCycleLength;
  if (!avgLength || avgLength < 20 || avgLength > 45) return null;

  // Only send if it's roughly time (this is a simplified check)
  const dayOfMonth = new Date().getDate();
  const isNearPrediction = dayOfMonth % avgLength >= avgLength - 3;
  if (!isNearPrediction) return null;

  const texts: Record<string, { title: string; body: string }> = {
    en: { title: 'Period may be coming soon', body: 'Based on your cycle pattern, your period may start in the next few days.' },
    hi: { title: 'Period jaldi aa sakta hai', body: 'Aapke cycle pattern ke hisaab se, aapka period agle kuch dino mein shuru ho sakta hai.' },
  };
  return texts[language] ?? texts.en;
}
