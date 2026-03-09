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

  // Build user context from local data
  const getUserContext = useCallback((): UserContext => {
    // TODO: Query SQLite for current cycle day, last mood, streak, pregnancy status
    return {};
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    sessionRef.current?.startListening(getUserContext());
  }, [getUserContext]);

  const stopListening = useCallback(() => {
    sessionRef.current?.stopListening(getUserContext());
  }, [getUserContext]);

  const processText = useCallback(
    (text: string) => {
      setError(null);
      sessionRef.current?.processText(text, getUserContext());
    },
    [getUserContext],
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
