/**
 * useWeeklySummary — React hook for the Weekly Summary screen.
 * Fetches summary from Firestore, manages audio playback.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db as firestore } from '../src/config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { requestWeeklySummary } from '../lib/ai/cloud-api';

interface WeeklySummaryData {
  summaryText: string;
  audioUrl: string;
  insights: Array<{ title: string; detail: string; domain: string }>;
  weekOf: string;
}

interface UseWeeklySummaryReturn {
  summary: WeeklySummaryData | null;
  isLoading: boolean;
  isPlaying: boolean;
  playbackProgress: number;
  playbackDuration: string;
  playbackPosition: string;
  error: string | null;
  play: () => void;
  pause: () => void;
  refresh: () => void;
}

export function useWeeklySummary(): UseWeeklySummaryReturn {
  const { user } = useAuth();
  const soundRef = useRef<Audio.Sound | null>(null);

  const [summary, setSummary] = useState<WeeklySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch latest summary from Firestore
  const fetchSummary = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      const summariesRef = collection(firestore, `users/${user.uid}/weekly_summaries`);
      const q = query(summariesRef, orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const data = snap.docs[0].data() as WeeklySummaryData;
        setSummary(data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      console.warn('Failed to fetch summary:', err);
      setError('Could not load summary');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSummary();
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, [fetchSummary]);

  const play = useCallback(async () => {
    if (!summary?.audioUrl) return;

    try {
      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: summary.audioUrl },
        { shouldPlay: true },
      );
      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;

        setPositionMs(status.positionMillis);
        setDurationMs(status.durationMillis ?? 0);

        if (status.durationMillis) {
          setPlaybackProgress(status.positionMillis / status.durationMillis);
        }

        if (status.didJustFinish) {
          setIsPlaying(false);
          setPlaybackProgress(0);
          setPositionMs(0);
          soundRef.current?.setPositionAsync(0);
        }
      });
    } catch (err) {
      setError('Could not play audio');
      setIsPlaying(false);
    }
  }, [summary?.audioUrl]);

  const pause = useCallback(async () => {
    await soundRef.current?.pauseAsync();
    setIsPlaying(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await requestWeeklySummary();
      setSummary({ ...result, weekOf: new Date().toISOString().split('T')[0] });
    } catch (err) {
      setError('Could not generate summary');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    summary,
    isLoading,
    isPlaying,
    playbackProgress,
    playbackDuration: formatTime(durationMs),
    playbackPosition: formatTime(positionMs),
    error,
    play,
    pause,
    refresh,
  };
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
