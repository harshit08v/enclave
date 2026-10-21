/**
 * ENCLAVE Firebase Client Authentication Module
 * Initializes Firebase App and Auth SDK with client credentials.
 * Provides helper functions for Email/Password, Google Sign-In, and verification.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  applyActionCode,
  sendPasswordResetEmail,
  type User as FirebaseUser,
  type Auth
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB0f6mmEl2Wgux8_4DvoQxys-Vn76R5Qh4',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'enclave-1cd2f.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'enclave-1cd2f',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'enclave-1cd2f.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '269743748468',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:269743748468:web:acf89bf23388e53d69e821',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-PL48TPKE6S'
};

// Initialize Firebase singleton
export const firebaseApp: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth singleton
export const auth: Auth = getAuth(firebaseApp);
export function getFirebaseAuth(): Auth {
  return auth;
}

// Google Auth Provider configured with prompt for account selection
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Signs in using Google via a browser popup, with seamless redirect fallback
 * if popups are blocked by browser security settings or on mobile devices.
 * Google accounts are verified by default (`emailVerified: true`).
 */
export async function signInWithGoogle(): Promise<{ user: FirebaseUser } | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
      console.warn('[FIREBASE AUTH] Popup blocked/cancelled. Falling back to redirect sign-in flow...');
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

/**
 * Checks if a user has completed sign-in via redirect fallback.
 */
export async function checkGoogleRedirectResult(): Promise<{ user: FirebaseUser } | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return { user: result.user };
    }
    return null;
  } catch (err: unknown) {
    console.warn('[FIREBASE AUTH] Google redirect check notice:', err);
    throw err;
  }
}

/**
 * Signs in using Email and Password.
 */
export async function signInWithEmail(email: string, pass: string): Promise<{ user: FirebaseUser }> {
  const result = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return { user: result.user };
}

/**
 * Registers a new account with Email, Password, and Display Name.
 * Automatically dispatches the Firebase email verification link.
 */
export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName: string
): Promise<{ user: FirebaseUser }> {
  const result = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  
  if (displayName.trim()) {
    try {
      await updateProfile(result.user, { displayName: displayName.trim() });
    } catch {
      // Non-critical profile update failure
    }
  }

  // Dispatch Firebase email verification
  try {
    await sendEmailVerification(result.user);
  } catch (err) {
    console.warn('[FIREBASE AUTH] Initial verification email dispatch notice:', err);
  }

  return { user: result.user };
}

/**
 * Resends a Firebase email verification link to the current or given user.
 */
export async function resendVerificationEmail(user?: FirebaseUser | null): Promise<void> {
  const targetUser = user || auth.currentUser;
  if (!targetUser) {
    throw new Error('No user is currently signed in to receive a verification email.');
  }
  await sendEmailVerification(targetUser);
}

/**
 * Signs out from Firebase Authentication.
 */
export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Fetches the current Firebase ID token (JWT) for authenticating API requests.
 */
export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  if (!auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

/**
 * Applies a Firebase action code (oobCode) from an email verification link.
 */
export async function verifyFirebaseEmailCode(oobCode: string): Promise<void> {
  await applyActionCode(auth, oobCode);
}

/**
 * Sends a password reset email using Firebase Authentication.
 */
export async function resetUserPassword(email: string): Promise<void> {
  if (!email || !email.trim()) {
    throw new Error('Please enter your email address to reset your password.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Maps Firebase Auth error codes into clean, actionable user messages.
 * Preserves user-friendly validation while maintaining security against enumeration.
 */
export function mapFirebaseError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  const code = (err as { code?: string }).code || '';

  switch (code) {
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/user-not-found':
      return 'No account found with this email. Create an account to continue.';
    case 'auth/invalid-credential':
      // Firebase often returns invalid-credential to protect against account enumeration
      return 'Invalid email address or password. Please verify your credentials.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/missing-password':
    case 'auth/missing-email':
      return 'Please enter both your email and password.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Access temporarily restricted due to many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Unable to connect. Please check your internet connection and try again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completion.';
    case 'auth/cancelled-popup-request':
      return 'Only one sign-in window can be open at a time. Please complete the open sign-in prompt.';
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/unauthorized-domain': {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'enclave.vercel.app';
      return `Domain unauthorized: "${currentHost}" is not listed in your Firebase Authorized Domains. In Firebase Console, go to Authentication > Settings > Authorized domains and add "${currentHost}".`;
    }
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled in Firebase. In Firebase Console, go to Authentication > Sign-in method and enable the Google provider.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication configuration not found. Please verify your Firebase project setup and environment keys.';
    case 'auth/invalid-api-key':
      return 'Invalid Firebase API key. Please check your environment variables.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Please sign in with email and password.';
    case 'auth/internal-error': {
      const customData = (err as { customData?: Record<string, unknown> }).customData;
      const serverResponse = (customData?._tokenResponse as { error?: { message?: string } })?.error?.message;
      if (serverResponse) {
        return `Authentication service error (${serverResponse}). Please try again or check browser settings.`;
      }
      return 'Authentication service encountered an internal error. Please ensure popups and third-party storage are allowed, or try again.';
    }
    default:
      return (err as { message?: string }).message || 'Unable to complete sign in. Please try again.';
  }
}
