/**
 * Maa Cloud Functions — Firebase Functions v2 (asia-south1)
 *
 * All AI API keys are server-side only. Client sends audio/text,
 * gets back processed responses. Zero API key exposure.
 */
import { initializeApp } from 'firebase-admin/app';

initializeApp();

// Voice pipeline
export { voiceStt } from './stt';
export { voiceTts } from './tts';
export { voiceGemini } from './gemini';

// Engagement
export { calculateScore } from './score';
export { generateWeeklyGoals } from './goals';

// Weekly summary (on-demand + scheduled Saturday 9PM IST)
export { generateWeeklySummary, scheduledWeeklySummary } from './weekly-summary';

// Push notifications (Sunday 7PM IST summary + daily proactive + targeted)
export {
  sundaySummaryNotification,
  dailyProactiveNotifications,
  ovulationWindowNotification,
  pmsAlertNotification,
  gentleReengagementNotification,
  milestoneProximityNotification,
  medicationReminderNotification,
  eveningMedicationReminderNotification,
} from './notifications';
