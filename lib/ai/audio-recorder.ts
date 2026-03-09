/**
 * Audio recording wrapper using expo-av.
 * Records 16kHz mono audio for STT processing.
 * Uses amplitude metering for silence detection.
 */
import { Audio } from 'expo-av';
import { AUDIO_CONFIG } from './types';

/** Callback invoked when silence is detected via amplitude metering */
export type OnSilenceDetected = () => void;

/** Amplitude threshold in dB below which we consider "silence" */
const SILENCE_THRESHOLD_DB = -40;

/** How often expo-av reports metering status (ms) */
const METERING_INTERVAL_MS = 250;

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: AUDIO_CONFIG.sampleRate,
    numberOfChannels: AUDIO_CONFIG.channels,
    bitRate: AUDIO_CONFIG.sampleRate * AUDIO_CONFIG.bitDepth * AUDIO_CONFIG.channels,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: AUDIO_CONFIG.sampleRate,
    numberOfChannels: AUDIO_CONFIG.channels,
    bitRate: AUDIO_CONFIG.sampleRate * AUDIO_CONFIG.bitDepth * AUDIO_CONFIG.channels,
    linearPCMBitDepth: AUDIO_CONFIG.bitDepth,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private permissionGranted = false;
  private onSilenceDetected: OnSilenceDetected | null = null;
  private silenceSince: number | null = null;
  private hasSpeechStarted = false;

  async requestPermission(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    this.permissionGranted = status === 'granted';
    return this.permissionGranted;
  }

  /**
   * Start recording with optional amplitude-based silence detection.
   * @param onSilence Called once when amplitude stays below threshold for silenceThresholdMs
   */
  async start(onSilence?: OnSilenceDetected): Promise<void> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) throw new Error('Microphone permission denied');
    }

    this.onSilenceDetected = onSilence ?? null;
    this.silenceSince = null;
    this.hasSpeechStarted = false;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      RECORDING_OPTIONS,
      this.handleRecordingStatus,
      METERING_INTERVAL_MS,
    );
    this.recording = recording;
  }

  async stop(): Promise<string> {
    if (!this.recording) throw new Error('No active recording');

    this.onSilenceDetected = null;
    this.silenceSince = null;

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    if (!uri) throw new Error('Recording URI is null');
    return uri;
  }

  async cancel(): Promise<void> {
    this.onSilenceDetected = null;
    this.silenceSince = null;
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // Already stopped
      }
      this.recording = null;
    }
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  /**
   * Metering callback — checks if amplitude has been below the silence
   * threshold for longer than AUDIO_CONFIG.silenceThresholdMs.
   * Only triggers after speech has been detected at least once.
   */
  private handleRecordingStatus = (status: Audio.RecordingStatus): void => {
    if (!status.isRecording || !status.metering) return;

    const metering = status.metering; // dB value, typically -160 to 0

    if (metering > SILENCE_THRESHOLD_DB) {
      // Sound detected — reset silence timer and mark speech started
      this.hasSpeechStarted = true;
      this.silenceSince = null;
      return;
    }

    // Below threshold — only start counting silence after speech has started
    if (!this.hasSpeechStarted) return;

    const now = Date.now();
    if (this.silenceSince === null) {
      this.silenceSince = now;
      return;
    }

    const silenceDuration = now - this.silenceSince;
    if (silenceDuration >= AUDIO_CONFIG.silenceThresholdMs && this.onSilenceDetected) {
      const callback = this.onSilenceDetected;
      this.onSilenceDetected = null; // Fire only once
      callback();
    }
  };
}
