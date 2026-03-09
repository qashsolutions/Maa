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

// --- Helper: days between two dates ---
function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

// --- Ovulation Window Notification ---

function getOvulationNotificationText(language: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    en: { title: 'Fertile window approaching', body: 'Your fertile window may be approaching. Talk to Maa for insights.' },
    hi: { title: 'Fertile window nazdeek aa raha hai', body: 'Aapki fertile window nazdeek aa rahi hai. Maa se baat karein.' },
    ta: { title: 'Karuththarikkum kaalam nerungikiratu', body: 'Ungal karuththarikkum kaalam nerungikiratu. Maa idam pesungal.' },
    te: { title: 'Samphalana samayam daggarapadutundi', body: 'Mee samphalana samayam daggarapadutundi. Maa tho matladandi.' },
    kn: { title: 'Phalvanthike samaya hathiravaguttide', body: 'Nimma phalvanthike samaya hathiravaguttide. Maa jothege maathadi.' },
    bn: { title: 'Upjauk samay asche', body: 'Apnar upjauk samay kachhakaachhi. Maa er sathe kotha bolun.' },
    mr: { title: 'Prajanan kalawadhi jawal yetoy', body: 'Tumchi prajanan kalawadhi jawal yetoy. Maa shi bola.' },
    gu: { title: 'Prajanan samay nazdik aavi rahyo che', body: 'Tamaro prajanan samay nazdik aavi rahyo che. Maa sathe vaat karo.' },
    ml: { title: 'Phalavathkaramaaya samayam aduthaayirikkunnu', body: 'Ningalude phalavathkaramaaya samayam aduthaayirikkunnu. Maa yodu samsaarikku.' },
    pa: { title: 'Upjaau samaa nazdeek aa riha hai', body: 'Tuhaada upjaau samaa nazdeek aa riha hai. Maa naal gall karo.' },
  };
  return texts[language] ?? texts.en;
}

/** Ovulation window notification — runs daily at 9AM IST */
export const ovulationWindowNotification = onSchedule(
  {
    schedule: 'every day 03:30', // 9AM IST = 3:30AM UTC
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const messages: Array<{ token: string; notification: { title: string; body: string }; data: Record<string, string> }> = [];
    const today = new Date();

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

      // Get cycle data
      const cycleDoc = await db.doc(`users/${uid}/anonymized_data/cycle_summary`).get();
      const cycleData = cycleDoc.exists ? cycleDoc.data() : null;

      if (!cycleData?.avgCycleLength || !cycleData?.lastPeriodStart) continue;

      const avgCycleLength = cycleData.avgCycleLength as number;
      if (avgCycleLength < 20 || avgCycleLength > 45) continue;

      const lastPeriodStart = new Date(cycleData.lastPeriodStart as string);
      // Ovulation is ~14 days before the next predicted period
      const nextPeriodStart = new Date(lastPeriodStart.getTime() + avgCycleLength * 24 * 60 * 60 * 1000);
      const ovulationDate = new Date(nextPeriodStart.getTime() - 14 * 24 * 60 * 60 * 1000);
      const daysToOvulation = daysBetween(today, ovulationDate);

      // Notify if ovulation is within 2 days (approaching)
      if (daysToOvulation <= 2 && ovulationDate >= today) {
        const { title, body } = getOvulationNotificationText(language);
        messages.push({
          token,
          notification: { title, body },
          data: { type: 'ovulation_window', screen: 'home' },
        });
      }
    }

    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      await messaging.sendEach(batch);
    }

    console.log(`Sent ${messages.length} ovulation window notifications`);
  },
);

// --- PMS Alert Notification ---

function getPmsAlertText(language: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    en: { title: 'Your period may start soon', body: 'Your period may start soon. Maa is here if you need support.' },
    hi: { title: 'Aapka period jaldi shuru ho sakta hai', body: 'Aapka period jaldi shuru ho sakta hai. Maa yahan hai agar aapko sahara chahiye.' },
    ta: { title: 'Ungal maadhavidaay viravil thodangalaam', body: 'Ungal maadhavidaay viravil thodangalaam. Maa ungalukku udhavikku irukkiraaru.' },
    te: { title: 'Mee rutucharya tvaralo prarambham avvavachu', body: 'Mee rutucharya tvaralo prarambham avvavachu. Maa ikkada undi.' },
    kn: { title: 'Nimma maasika sravu bega prarambhavaagabahudu', body: 'Nimma maasika sravu bega prarambhavaagabahudu. Maa illi iddaare.' },
    bn: { title: 'Apnar mashik shighrai shuru hote pare', body: 'Apnar mashik shighrai shuru hote pare. Maa ekhane achhe.' },
    mr: { title: 'Tumchi maasik paali lavkarach suru hoil', body: 'Tumchi maasik paali lavkarach suru hoil. Maa aahe tumchyasathi.' },
    gu: { title: 'Tamaru masik jaldi sharu thai shake chhe', body: 'Tamaru masik jaldi sharu thai shake chhe. Maa aheen chhe tamara mate.' },
    ml: { title: 'Ningalude aartavam udan thudangiyekkam', body: 'Ningalude aartavam udan thudangiyekkam. Maa ivideyundu.' },
    pa: { title: 'Tuhaada mahavaari jaldi shuru ho sakdi hai', body: 'Tuhaada mahavaari jaldi shuru ho sakdi hai. Maa ithhe hai tuhaade lyi.' },
  };
  return texts[language] ?? texts.en;
}

/** PMS alert notification — runs daily at 11AM IST (only for users with 6+ tracked cycles) */
export const pmsAlertNotification = onSchedule(
  {
    schedule: 'every day 05:30', // 11AM IST = 5:30AM UTC
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const messages: Array<{ token: string; notification: { title: string; body: string }; data: Record<string, string> }> = [];
    const today = new Date();

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

      const cycleDoc = await db.doc(`users/${uid}/anonymized_data/cycle_summary`).get();
      const cycleData = cycleDoc.exists ? cycleDoc.data() : null;

      if (!cycleData?.avgCycleLength || !cycleData?.lastPeriodStart) continue;
      // Only send PMS alert if user has tracked 6+ cycles
      const totalCycles = (cycleData.totalCycles as number) ?? 0;
      if (totalCycles < 6) continue;

      const avgCycleLength = cycleData.avgCycleLength as number;
      if (avgCycleLength < 20 || avgCycleLength > 45) continue;

      const lastPeriodStart = new Date(cycleData.lastPeriodStart as string);
      const nextPeriodStart = new Date(lastPeriodStart.getTime() + avgCycleLength * 24 * 60 * 60 * 1000);
      const daysToPeriod = daysBetween(today, nextPeriodStart);

      // Notify if period is 3-5 days away (PMS window)
      if (daysToPeriod >= 3 && daysToPeriod <= 5 && nextPeriodStart > today) {
        const { title, body } = getPmsAlertText(language);
        messages.push({
          token,
          notification: { title, body },
          data: { type: 'pms_alert', screen: 'home' },
        });
      }
    }

    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      await messaging.sendEach(batch);
    }

    console.log(`Sent ${messages.length} PMS alert notifications`);
  },
);

// --- Gentle Re-engagement Notification ---

function getReengagementText(language: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    en: { title: 'Maa is here for you', body: "It's been a while! Maa is always here when you're ready to talk." },
    hi: { title: 'Maa yahan hai tumhare liye', body: 'Bahut din ho gaye! Maa hamesha yahan hai jab tum baat karna chaho.' },
    ta: { title: 'Maa ungalukkaaga irukkiraaru', body: 'Romba naal aagiduchu! Neenga pesa ninaikum podhu Maa eppodhum irukkiraaru.' },
    te: { title: 'Maa mee kosam ikkada undi', body: 'Chala rojulu ayyindi! Meeru matladaalani anipinchinappudu Maa epudu ikkade untundi.' },
    kn: { title: 'Maa nimage iddaare', body: 'Tumba dina aaytu! Neenu maataadalu beku anisidaaga Maa yavagalu iddaare.' },
    bn: { title: 'Maa apnar jonno achhe', body: 'Onek din hoye geche! Apni kotha bolte chaile Maa sorboda achhe.' },
    mr: { title: 'Maa aahe tumchyasathi', body: 'Khup divas zale! Tumhala bolayche aste tevha Maa nehmi aahe.' },
    gu: { title: 'Maa tamara mate aheen chhe', body: 'Ghana divas thai gaya! Tamne vaat karvi hoy tyare Maa hamesha aheen chhe.' },
    ml: { title: 'Maa ningalkkaayirikkunnu', body: 'Valare naal aayi! Ningal samsaarikkaan thayaaraakumbol Maa eppozhum ivideyundu.' },
    pa: { title: 'Maa tuhaade lyi ithhe hai', body: 'Bahut din ho gaye! Jado tusi gall karna chaho Maa hamesha ithhe hai.' },
  };
  return texts[language] ?? texts.en;
}

/** Gentle re-engagement — runs daily at 6PM IST, targets users inactive for 5+ days */
export const gentleReengagementNotification = onSchedule(
  {
    schedule: 'every day 12:30', // 6PM IST = 12:30PM UTC
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const messages: Array<{ token: string; notification: { title: string; body: string }; data: Record<string, string> }> = [];
    const now = new Date();
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

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

      // Check last conversation timestamp
      const conversationsSnap = await db.collection(`users/${uid}/anonymized_data`)
        .doc('activity')
        .get();
      const activityData = conversationsSnap.exists ? conversationsSnap.data() : null;

      const lastConversation = activityData?.lastConversationAt
        ? new Date(activityData.lastConversationAt as string)
        : null;

      // Send if user hasn't had a conversation in 5+ days (or never had one but has a profile)
      if (!lastConversation || lastConversation < fiveDaysAgo) {
        const { title, body } = getReengagementText(language);
        messages.push({
          token,
          notification: { title, body },
          data: { type: 'reengagement', screen: 'home' },
        });
      }
    }

    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      await messaging.sendEach(batch);
    }

    console.log(`Sent ${messages.length} re-engagement notifications`);
  },
);

// --- Medication Reminder Notification ---

function getMedicationReminderText(language: string, medName: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    en: { title: 'Time for your medication', body: `Reminder to take ${medName}. Maa is keeping track for you.` },
    hi: { title: 'Dawai lene ka samay', body: `${medName} lene ka samay ho gaya hai. Maa dhyan rakh rahi hai.` },
    ta: { title: 'Marundhu edukkum neram', body: `${medName} edukkum neram aagivittadhu. Maa ungalukkaaga kavanithukkondirukkiraaru.` },
    te: { title: 'Mandu vesukune samayam', body: `${medName} vesukune samayam ayyindi. Maa mee kosam gamanistundi.` },
    kn: { title: 'Aushadhi thegedukolluvudu samaya', body: `${medName} thegedukolluvudu samaya aagide. Maa nimma kosam gamanisuttiddaare.` },
    bn: { title: 'Osudh khabar samay', body: `${medName} khabar samay hoyeche. Maa apnar jonno lakshya rakhche.` },
    mr: { title: 'Aushadh ghenyachi vel', body: `${medName} ghenyachi vel zali aahe. Maa tumchyasathi laksh thevte.` },
    gu: { title: 'Dawa levano samay', body: `${medName} levano samay thai gayo chhe. Maa tamara mate dhyan rakhhe chhe.` },
    ml: { title: 'Marunnu kazhikkenda samayam', body: `${medName} kazhikkenda samayam aayi. Maa ningalkkaayittu shraddhikkunnundu.` },
    pa: { title: 'Dawai lain da samaa', body: `${medName} lain da samaa ho gaya hai. Maa tuhaade lyi dhyan rakh rahi hai.` },
  };
  return texts[language] ?? texts.en;
}

/** Morning medication reminder — runs daily at 8AM IST */
export const medicationReminderNotification = onSchedule(
  {
    schedule: 'every day 02:30', // 8AM IST = 2:30AM UTC
    timeZone: 'Asia/Kolkata',
    region: 'asia-south1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const messages: Array<{ token: string; notification: { title: string; body: string }; data: Record<string, string> }> = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday

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

      // Get active medications for this user
      const medsSnap = await db.collection(`users/${uid}/medications`)
        .where('active', '==', true)
        .where('reminderTime', '==', 'morning')
        .get();

      for (const medDoc of medsSnap.docs) {
        const med = medDoc.data();
        const frequency = med.frequency as string;

        // Morning: send for daily, twice_daily, or weekly (if dayOfWeek matches)
        if (frequency === 'daily' || frequency === 'twice_daily') {
          const medName = med.name as string;
          const { title, body } = getMedicationReminderText(language, medName);
          messages.push({
            token,
            notification: { title, body },
            data: { type: 'medication_reminder', screen: 'home' },
          });
        } else if (frequency === 'weekly' && med.dayOfWeek === dayOfWeek) {
          const medName = med.name as string;
          const { title, body } = getMedicationReminderText(language, medName);
          messages.push({
            token,
            notification: { title, body },
            data: { type: 'medication_reminder', screen: 'home' },
          });
        }
      }
    }

    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      await messaging.sendEach(batch);
    }

    console.log(`Sent ${messages.length} morning medication reminder notifications`);
  },
);

/** Evening medication reminder — runs daily at 8PM IST */
export const eveningMedicationReminderNotification = onSchedule(
  {
    schedule: 'every day 14:30', // 8PM IST = 2:30PM UTC
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

      // Get active twice_daily medications with evening reminder
      const medsSnap = await db.collection(`users/${uid}/medications`)
        .where('active', '==', true)
        .where('frequency', '==', 'twice_daily')
        .get();

      for (const medDoc of medsSnap.docs) {
        const med = medDoc.data();
        const medName = med.name as string;
        const { title, body } = getMedicationReminderText(language, medName);
        messages.push({
          token,
          notification: { title, body },
          data: { type: 'medication_reminder', screen: 'home' },
        });
      }
    }

    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      await messaging.sendEach(batch);
    }

    console.log(`Sent ${messages.length} evening medication reminder notifications`);
  },
);

// --- Milestone Proximity Notification ---

function getMilestoneProximityText(language: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    en: { title: 'Almost there!', body: "You're almost at a new milestone! Keep tracking with Maa." },
    hi: { title: 'Bahut kareeb ho!', body: 'Tum ek naye milestone ke bahut kareeb ho! Maa ke saath tracking jaari rakho.' },
    ta: { title: 'Kidaitthu vitteerkal!', body: 'Neenga oru puthiya milestone ai adaiya pokireerkal! Maa udan thodarungal.' },
    te: { title: 'Daggaraga unnaru!', body: 'Meeru oka kotha milestone ki daggaraga unnaru! Maa tho track chesthu undandi.' },
    kn: { title: 'Hathira bandiddira!', body: 'Neenu hosa milestone ge hathira bandiddira! Maa jothege track maadi.' },
    bn: { title: 'Praye pouchhe gechhen!', body: 'Apni ekti natun milestone er kachhe! Maa er sathe track korun.' },
    mr: { title: 'Jawaljawal pohochla!', body: 'Tumhi eka navya milestone jawal aahat! Maa sobat tracking suru theva.' },
    gu: { title: 'Lagbhag pahonchi gaya!', body: 'Tame ek nava milestone ni najik chho! Maa sathe tracking chalu rakho.' },
    ml: { title: 'Ethaandu ethiyirikkunnu!', body: 'Ningal oru puthiya milestone nu aduthaayirikkunnu! Maa yodu track cheyyuka.' },
    pa: { title: 'Bahut nazdeek ho!', body: 'Tusi ek naven milestone de bahut nazdeek ho! Maa naal tracking jaari rakho.' },
  };
  return texts[language] ?? texts.en;
}

/** Milestone proximity — runs daily at 8PM IST, targets users close to unlocking a milestone */
export const milestoneProximityNotification = onSchedule(
  {
    schedule: 'every day 14:30', // 8PM IST = 2:30PM UTC
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

      // Get milestone data
      const milestonesSnap = await db.collection(`users/${uid}/milestones`).get();
      const cycleDoc = await db.doc(`users/${uid}/anonymized_data/cycle_summary`).get();
      const cycleData = cycleDoc.exists ? cycleDoc.data() : null;
      const totalCycles = (cycleData?.totalCycles as number) ?? 0;

      // Milestone thresholds: cycle_1=1, cycle_3=3, cycle_6=6, cycle_12=12
      const milestoneThresholds: Record<string, number> = {
        cycle_1: 1,
        cycle_3: 3,
        cycle_6: 6,
        cycle_12: 12,
      };

      let isCloseToMilestone = false;

      // Check from Firestore milestone docs
      const unlockedMilestones = new Set<string>();
      for (const mDoc of milestonesSnap.docs) {
        const mData = mDoc.data();
        if (mData.unlocked) {
          unlockedMilestones.add(mDoc.id);
        }
      }

      // Find the next locked milestone and check proximity
      for (const [milestoneId, threshold] of Object.entries(milestoneThresholds)) {
        if (unlockedMilestones.has(milestoneId)) continue;
        // User is close if they are within 2 cycles of unlocking
        const cyclesRemaining = threshold - totalCycles;
        if (cyclesRemaining > 0 && cyclesRemaining <= 2) {
          isCloseToMilestone = true;
          break;
        }
      }

      if (isCloseToMilestone) {
        const { title, body } = getMilestoneProximityText(language);
        messages.push({
          token,
          notification: { title, body },
          data: { type: 'milestone_proximity', screen: 'milestones' },
        });
      }
    }

    for (let i = 0; i < messages.length; i += 500) {
      const batch = messages.slice(i, i + 500);
      await messaging.sendEach(batch);
    }

    console.log(`Sent ${messages.length} milestone proximity notifications`);
  },
);
