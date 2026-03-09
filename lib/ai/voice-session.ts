/**
 * VoiceSession — the core agentic pipeline that ties everything together.
 *
 * Flow: tap orb -> record audio -> STT -> Gemini -> TTS -> play response
 *
 * This is the "brain" of Maa. It manages state transitions and coordinates
 * between recording, cloud AI, and playback.
 */
import * as FileSystem from 'expo-file-system';
import { AudioRecorder } from './audio-recorder';
import { TtsPlayer } from './tts-player';
import { speechToText, processWithGemini, textToSpeech } from './cloud-api';
import type { VoiceState, GeminiResponse, ConversationTurn, ExtractedHealthData } from './types';

export interface VoiceSessionCallbacks {
  onStateChange: (state: VoiceState) => void;
  onTranscript: (text: string) => void;
  onResponse: (response: GeminiResponse) => void;
  onError: (error: Error) => void;
  onTurnComplete: (turn: ConversationTurn) => void;
}

export interface UserContext {
  cycleDay?: number;
  lastMood?: number;
  currentStreak?: number;
  isPregnant?: boolean;
}

export class VoiceSession {
  private recorder = new AudioRecorder();
  private player = new TtsPlayer();
  private state: VoiceState = 'idle';
  private callbacks: VoiceSessionCallbacks;
  private languageCode: string;
  private voiceGender: 'female' | 'male';
  private voiceSpeed: number;
  private conversationHistory: Array<{ role: 'user' | 'assistant'; text: string }> = [];
  private recordingStartTime = 0;
  private pendingUserContext: UserContext = {};

  constructor(
    callbacks: VoiceSessionCallbacks,
    languageCode: string,
    voiceGender: 'female' | 'male' = 'female',
    voiceSpeed: number = 1.0,
  ) {
    this.callbacks = callbacks;
    this.languageCode = languageCode;
    this.voiceGender = voiceGender;
    this.voiceSpeed = voiceSpeed;
  }

  /** Start a voice interaction — user tapped the orb */
  async startListening(userContext: UserContext = {}): Promise<void> {
    if (this.state === 'listening') {
      // Already listening — treat as "done talking"
      await this.stopListening(userContext);
      return;
    }

    if (this.state === 'speaking') {
      // Interrupt TTS playback
      await this.player.stop();
    }

    try {
      this.setState('listening');
      this.recordingStartTime = Date.now();
      this.pendingUserContext = userContext;
      await this.recorder.start(() => {
        // Amplitude-based silence detection callback
        if (this.state === 'listening') {
          this.stopListening(this.pendingUserContext);
        }
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /** Stop recording and process — either user tapped again or silence detected */
  async stopListening(userContext: UserContext = {}): Promise<void> {
    if (this.state !== 'listening') return;

    try {
      const audioUri = await this.recorder.stop();
      const durationSeconds = Math.round((Date.now() - this.recordingStartTime) / 1000);

      this.setState('thinking');

      // Convert audio file to base64 for cloud function
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // STT
      const userText = await speechToText(audioBase64, this.languageCode);
      this.callbacks.onTranscript(userText);

      // Gemini
      const geminiResponse = await processWithGemini(
        userText,
        this.languageCode,
        this.conversationHistory.slice(-10), // Last 10 turns for context
        userContext,
      );
      this.callbacks.onResponse(geminiResponse);

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', text: userText },
        { role: 'assistant', text: geminiResponse.spoken_response },
      );

      // TTS
      this.setState('speaking');
      const audioResponse = await textToSpeech(
        geminiResponse.spoken_response,
        this.languageCode,
        this.voiceGender,
        this.voiceSpeed,
      );

      await this.player.play(audioResponse, () => {
        this.setState('idle');
      });

      // Emit completed turn for persistence
      const turn: ConversationTurn = {
        sessionDate: new Date().toISOString().split('T')[0],
        userText,
        aiResponse: geminiResponse.spoken_response,
        extractedData: geminiResponse.extracted_data,
        visualCardType: geminiResponse.visual_card?.type ?? null,
        languageCode: this.languageCode,
        durationSeconds,
      };
      this.callbacks.onTurnComplete(turn);

      // Cleanup temp audio file
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /** Process typed text instead of voice (text input fallback) */
  async processText(text: string, userContext: UserContext = {}): Promise<void> {
    try {
      this.setState('thinking');
      this.callbacks.onTranscript(text);

      const geminiResponse = await processWithGemini(
        text,
        this.languageCode,
        this.conversationHistory.slice(-10),
        userContext,
      );
      this.callbacks.onResponse(geminiResponse);

      this.conversationHistory.push(
        { role: 'user', text },
        { role: 'assistant', text: geminiResponse.spoken_response },
      );

      // TTS
      this.setState('speaking');
      const audioResponse = await textToSpeech(
        geminiResponse.spoken_response,
        this.languageCode,
        this.voiceGender,
        this.voiceSpeed,
      );

      await this.player.play(audioResponse, () => {
        this.setState('idle');
      });

      const turn: ConversationTurn = {
        sessionDate: new Date().toISOString().split('T')[0],
        userText: text,
        aiResponse: geminiResponse.spoken_response,
        extractedData: geminiResponse.extracted_data,
        visualCardType: geminiResponse.visual_card?.type ?? null,
        languageCode: this.languageCode,
        durationSeconds: 0,
      };
      this.callbacks.onTurnComplete(turn);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /** Cancel everything and return to idle */
  async cancel(): Promise<void> {
    await this.recorder.cancel();
    await this.player.stop();
    this.setState('idle');
  }

  /** Update language mid-session */
  setLanguage(code: string): void {
    this.languageCode = code;
  }

  /** Update voice settings */
  setVoiceSettings(gender: 'female' | 'male', speed: number): void {
    this.voiceGender = gender;
    this.voiceSpeed = speed;
  }

  /** Clear conversation history (new session) */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  getState(): VoiceState {
    return this.state;
  }

  private setState(state: VoiceState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private handleError(error: Error): void {
    this.setState('error');
    this.callbacks.onError(error);
    // Auto-recover to idle after error
    setTimeout(() => {
      if (this.state === 'error') this.setState('idle');
    }, 3000);
  }
}
