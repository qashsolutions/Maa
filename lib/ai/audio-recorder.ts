/**
 * Audio recording wrapper using expo-av.
 * Records 16kHz mono audio for STT processing.
 */
import { Audio } from 'expo-av';
import { AUDIO_CONFIG } from './types';

const RECORDING_OPTIONS: Audio.RecordingOptions = {
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

  async requestPermission(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    this.permissionGranted = status === 'granted';
    return this.permissionGranted;
  }

  async start(): Promise<void> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) throw new Error('Microphone permission denied');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
    this.recording = recording;
  }

  async stop(): Promise<string> {
    if (!this.recording) throw new Error('No active recording');

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
}
