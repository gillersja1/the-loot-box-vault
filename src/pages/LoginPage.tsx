import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { completeEmailLink, pendingEmailLink, sendEmailLink, signInWithGitHub, signInWithGoogle, storedEmail, useAuth } from '../lib/auth';

export function LoginPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);

  const linkHandled = useRef(false);
  useEffect(() => {
    // A sign-in code works once; guard against effects running twice (React StrictMode).
    if (linkHandled.current || !pendingEmailLink()) return;
    linkHandled.current = true;
    const saved = storedEmail();
    if (saved) completeEmailLink(saved).catch(() => toast('That sign-in link is expired or already used.', 'error'));
    else setNeedsEmail(true);
  }, [toast]);

  if (user) return <Navigate to="/" replace />;

  async function popup(fn: () => Promise<unknown>) {
    try {
      await fn();
      toast('Crawler identified. Welcome to the dungeon.');
    } catch {
      toast('Sign-in was cancelled or blocked.', 'error');
    }
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    try {
      if (needsEmail) await completeEmailLink(email);
      else {
        await sendEmailLink(email);
        setSent(true);
      }
    } catch {
      toast('Could not send the sign-in link. Check the address.', 'error');
    }
  }

  return (
    <section className="login hud-panel">
      <p className="eyebrow">Crawler Registration</p>
      <h1>Sign in</h1>
      <p>Your vault syncs across devices once the System knows who you are.</p>
      <div className="login-buttons">
        <button className="btn" onClick={() => popup(signInWithGoogle)}>
          Continue with Google
        </button>
        <button className="btn" onClick={() => popup(signInWithGitHub)}>
          Continue with GitHub
        </button>
      </div>
      <form onSubmit={onEmail} className="login-email">
        <label>
          <span>{needsEmail ? 'Confirm your email to finish signing in' : 'Or get a sign-in link by email'}</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="crawler@example.com" />
        </label>
        <button className="btn btn-primary" type="submit">
          {needsEmail ? 'Finish sign-in' : 'Email me a link'}
        </button>
      </form>
      {sent && <p className="notice">Link sent. Check your inbox (and the spam folder, the dungeon is like that).</p>}
    </section>
  );
}
