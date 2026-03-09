/**
 * useVoiceSession — React hook that wraps VoiceSession for the Voice Home screen.
 * Manages voice state, conversation turns, and data persistence.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { VoiceSession, type UserContext } from '../lib/ai/voice-session';
import type { VoiceState, GeminiResponse, ConversationTurn, VisualCard, NavigationTarget } from '../lib/ai/types';
import { detectNavigationIntent } from '../lib/ai/navigation-intent';
import { useDatabase } from '../contexts/DatabaseContext';
import { useLanguage } from '../contexts/LanguageContext';
import { saveConversationTurn, applyExtractedData } from '../lib/ai/conversation-store';
import { getString, StorageKeys } from '../lib/utils/storage';
import type { SQLiteDatabase } from '../lib/db/encrypted-database';

interface UseVoiceSessionReturn {
  voiceState: VoiceState;
  transcript: string;
  lastResponse: string;
  activeCard: VisualCard | null;
  error: string | null;
  navigationTarget: NavigationTarget;
  startListening: () => void;
  stopListening: () => void;
  processText: (text: string) => void;
  cancel: () => void;
  dismissCard: () => void;
  clearNavigationTarget: () => void;
}

export function useVoiceSession(): UseVoiceSessionReturn {
  const { db } = useDatabase();
  const { language: currentLanguage } = useLanguage();
  const sessionRef = useRef<VoiceSession | null>(null);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [activeCard, setActiveCard] = useState<VisualCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<NavigationTarget>(null);

  // Initialize session
  useEffect(() => {
    const voiceGender = (getString(StorageKeys.VOICE_GENDER) as 'female' | 'male') ?? 'female';
    const voiceSpeed = parseFloat(getString(StorageKeys.VOICE_SPEED) ?? '1.0');

    const session = new VoiceSession(
      {
        onStateChange: (state) => setVoiceState(state),
        onTranscript: (text) => {
          setTranscript(text);
          // Client-side navigation intent detection (fallback for when Gemini doesn't detect it)
          const clientNav = detectNavigationIntent(text);
          if (clientNav) {
            setNavigationTarget(clientNav);
          }
        },
        onResponse: (response: GeminiResponse) => {
          setLastResponse(response.spoken_response);
          if (response.visual_card) {
            setActiveCard(response.visual_card);
          }
          // Check for navigation intent from Gemini extracted data
          const geminiNav = response.extracted_data?.navigation_intent ?? null;
          if (geminiNav) {
            setNavigationTarget(geminiNav);
          }
        },
        onError: (err) => setError(err.message),
        onTurnComplete: async (turn: ConversationTurn) => {
          if (!db) return;
          // Persist conversation
          await saveConversationTurn(db, turn);
          // Apply extracted health data
          if (turn.extractedData) {
            await applyExtractedData(db, turn.extractedData, turn.sessionDate);
          }
        },
      },
      currentLanguage.code,
      voiceGender,
      voiceSpeed,
    );

    sessionRef.current = session;

    return () => {
      session.cancel();
    };
  }, [db, currentLanguage.code]);

  // Build user context from SQLite — queries cycle, mood, streak, pregnancy data
  const buildUserContext = useCallback(async (): Promise<UserContext> => {
    if (!db) return {};
    try {
      return await queryUserContext(db);
    } catch {
      // Non-fatal: Gemini works without context, just less personalized
      return {};
    }
  }, [db]);

  const startListening = useCallback(async () => {
    setError(null);
    const ctx = await buildUserContext();
    sessionRef.current?.startListening(ctx);
  }, [buildUserContext]);

  const stopListening = useCallback(async () => {
    const ctx = await buildUserContext();
    sessionRef.current?.stopListening(ctx);
  }, [buildUserContext]);

  const processText = useCallback(
    async (text: string) => {
      setError(null);
      const ctx = await buildUserContext();
      sessionRef.current?.processText(text, ctx);
    },
    [buildUserContext],
  );

  const cancel = useCallback(() => {
    sessionRef.current?.cancel();
    setError(null);
  }, []);

  const dismissCard = useCallback(() => {
    setActiveCard(null);
  }, []);

  const clearNavigationTarget = useCallback(() => {
    setNavigationTarget(null);
  }, []);

  return {
    voiceState,
    transcript,
    lastResponse,
    activeCard,
    error,
    navigationTarget,
    startListening,
    stopListening,
    processText,
    cancel,
    dismissCard,
    clearNavigationTarget,
  };
}

/**
 * Query SQLite for all user context Gemini needs.
 * Runs 4 parallel queries for speed on low-end devices.
 */
async function queryUserContext(db: SQLiteDatabase): Promise<UserContext> {
  const [lastCycle, lastMoodRow, streakRow, profileRow, pregnancyRow, cycleHistory] =
    await Promise.all([
      // Most recent cycle start
      db.getFirstAsync<{ start_date: string }>(
        `SELECT start_date FROM cycles ORDER BY start_date DESC LIMIT 1`,
      ),
      // Most recent mood
      db.getFirstAsync<{ mood_level: number }>(
        `SELECT mood_level FROM daily_logs WHERE mood_level IS NOT NULL ORDER BY log_date DESC LIMIT 1`,
      ),
      // Current streak
      db.getFirstAsync<{ current_streak: number }>(
        `SELECT current_streak FROM streaks WHERE id = 1`,
      ),
      // Profile: cycle length avg + pregnancy status
      db.getFirstAsync<{ cycle_length_avg: number | null; pregnancy_status: string | null }>(
        `SELECT cycle_length_avg, pregnancy_status FROM user_profile WHERE id = 1`,
      ),
      // Active pregnancy
      db.getFirstAsync<{ current_week: number | null }>(
        `SELECT current_week FROM pregnancy WHERE active = 1 ORDER BY confirmed_date DESC LIMIT 1`,
      ),
      // Last 3 cycles for summary
      db.getAllAsync<{ start_date: string; end_date: string | null }>(
        `SELECT start_date, end_date FROM cycles ORDER BY start_date DESC LIMIT 3`,
      ),
    ]);

  const ctx: UserContext = {};
  const avgCycleLength = profileRow?.cycle_length_avg ?? 28;
  ctx.averageCycleLength = avgCycleLength;

  if (lastCycle) {
    ctx.lastPeriodDate = lastCycle.start_date;
    const daysSince = Math.floor(
      (Date.now() - new Date(lastCycle.start_date).getTime()) / (24 * 60 * 60 * 1000),
    );
    // cycleDay is 1-indexed (day 1 = first day of period)
    if (daysSince >= 0 && daysSince < avgCycleLength * 2) {
      ctx.cycleDay = daysSince + 1;
    }
  }

  if (lastMoodRow) {
    ctx.lastMood = lastMoodRow.mood_level;
  }

  if (streakRow) {
    ctx.currentStreak = streakRow.current_streak;
  }

  const isPregnant = profileRow?.pregnancy_status === 'pregnant';
  if (isPregnant) {
    ctx.isPregnant = true;
    if (pregnancyRow?.current_week) {
      ctx.pregnancyWeek = pregnancyRow.current_week;
    }
  }

  if (cycleHistory && cycleHistory.length > 0) {
    const summaryParts = cycleHistory.map((c) => {
      const duration = c.end_date
        ? Math.floor(
            (new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) /
              (24 * 60 * 60 * 1000),
          ) + 1
        : null;
      return duration
        ? `${c.start_date} (${duration} days)`
        : `${c.start_date} (ongoing)`;
    });
    ctx.cycleHistorySummary = summaryParts.join(', ');
  }

  return ctx;
}
