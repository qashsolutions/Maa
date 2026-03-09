/**
 * TTS audio playback using expo-av.
 * Plays base64-encoded audio returned from Cloud Functions.
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export class TtsPlayer {
  private sound: Audio.Sound | null = null;
  private onFinish: (() => void) | null = null;

  /** Play base64-encoded audio */
  async play(audioBase64: string, onFinish?: () => void): Promise<void> {
    this.onFinish = onFinish ?? null;

    // Write base64 to temp file (expo-av needs a URI)
    const fileUri = `${FileSystem.cacheDirectory}maa_tts_${Date.now()}.wav`;
    await FileSystem.writeAsStringAsync(fileUri, audioBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const { sound } = await Audio.Sound.createAsync(
      { uri: fileUri },
      { shouldPlay: true },
    );
    this.sound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        this.cleanup(fileUri);
        this.onFinish?.();
      }
    });
  }

  /** Stop current playback */
  async stop(): Promise<void> {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  private async cleanup(fileUri: string): Promise<void> {
    try {
      await this.sound?.unloadAsync();
      this.sound = null;
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch {
      // Best-effort cleanup
    }
  }

  isPlaying(): boolean {
    return this.sound !== null;
  }
}
