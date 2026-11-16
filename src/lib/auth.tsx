import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GithubAuthProvider,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';
import { isAdmin } from './api';

interface AuthState {
  user: User | null;
  admin: boolean;
  ready: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, admin: false, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, admin: false, ready: false });
  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        setState({ user, admin: user ? await isAdmin(user.uid) : false, ready: true });
      }),
    [],
  );
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

const EMAIL_KEY = 'lbv.emailForSignIn';

export const signInWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signInWithGitHub = () => signInWithPopup(auth, new GithubAuthProvider());
export const signOutUser = () => signOut(auth);

export async function sendEmailLink(email: string) {
  await sendSignInLinkToEmail(auth, email, { url: `${window.location.origin}/login`, handleCodeInApp: true });
  try {
    window.localStorage.setItem(EMAIL_KEY, email);
  } catch {
    /* storage blocked: user will be asked for the email again */
  }
}

export function pendingEmailLink(): boolean {
  return isSignInWithEmailLink(auth, window.location.href);
}

export function storedEmail(): string | null {
  try {
    return window.localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export async function completeEmailLink(email: string) {
  await signInWithEmailLink(auth, email, window.location.href);
  try {
    window.localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* ignore */
  }
}
