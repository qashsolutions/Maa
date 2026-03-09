/**
 * Firebase Phone Auth wrapper.
 * Handles signInWithPhoneNumber and OTP verification.
 */
import {
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth } from '../../src/config/firebase';

let confirmationResult: ConfirmationResult | null = null;

/** Send OTP to phone number. Returns true on success. */
export async function sendOtp(phoneNumber: string): Promise<boolean> {
  try {
    // Firebase requires a RecaptchaVerifier for web, but on native
    // this is handled by the Firebase SDK internally.
    // For Expo, we need to use the signInWithPhoneNumber method.
    // Note: In production, this requires proper reCAPTCHA setup.
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber);
    return true;
  } catch (error) {
    console.error('Send OTP failed:', error);
    return false;
  }
}

/** Verify OTP code. Returns true on success (user is now signed in). */
export async function verifyOtp(code: string): Promise<boolean> {
  if (!confirmationResult) {
    throw new Error('No pending OTP verification. Call sendOtp first.');
  }

  try {
    await confirmationResult.confirm(code);
    confirmationResult = null;
    return true;
  } catch (error) {
    console.error('OTP verification failed:', error);
    return false;
  }
}

/** Sign out the current user */
export async function signOut(): Promise<void> {
  await auth.signOut();
}
