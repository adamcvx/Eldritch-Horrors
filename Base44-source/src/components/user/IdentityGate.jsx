import { createContext, useContext, useEffect, useState } from 'react';
import {
  acceptInvite, getUser, handleAuthCallback, login, logout, recoverPassword,
  requestPasswordRecovery, signup,
} from '@netlify/identity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const titles = {
  login: 'Sign in',
  register: 'Create an account',
  forgot: 'Reset your password',
  reset: 'Set a new password',
  invite: 'Accept invitation',
};
const AccountEmailContext = createContext(null);
export const useAccountEmail = () => useContext(AccountEmailContext);

let startup;

function openSession() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const recovery = params.get('recovery_token');
  const invitation = params.get('invite_token');
  if (recovery || invitation) {
    history.replaceState(history.state, '', window.location.pathname + window.location.search);
    return { link: { mode: recovery ? 'reset' : 'invite', token: recovery || invitation } };
  }
  return handleAuthCallback().then(async () => ({ user: await getUser() }));
}

export function SignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setBusy(true);
    setError('');
    try {
      await logout();
      window.location.replace('/');
    } catch {
      setError('Sign-out failed. Please try again.');
      setBusy(false);
    }
  }

  return <div className="mt-6 space-y-2 border-t pt-5">
    <Button type="button" variant="outline" onClick={signOut} disabled={busy}>
      {busy ? 'Signing out…' : 'Sign out'}
    </Button>
    {error && <p role="alert">{error}</p>}
  </div>;
}

export default function IdentityGate({ children }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [link, setLink] = useState(null);
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    startup ??= Promise.resolve().then(openSession);
    startup.then(result => {
      if (!active) return;
      setUser(result.user ?? null);
      setLink(result.link ?? null);
      if (result.link) setMode(result.link.mode);
    }).catch(() => {
      if (active) setError('We couldn’t verify your session or email link. Try signing in or request a new link.');
    }).finally(() => {
      if (active) setReady(true);
    });
    return () => { active = false; };
  }, []);

  const newPassword = ['register', 'reset', 'invite'].includes(mode);
  const needsEmail = mode !== 'reset' && mode !== 'invite';

  function navigate(next, notice = '') {
    setMode(next);
    setError('');
    setMessage(notice);
    setLink(null);
  }

  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = data.get('password');

    setError('');
    setMessage('');
    if (newPassword && password !== data.get('confirm')) {
      setError('The passwords must match.');
      return;
    }
    setBusy(true);
    try {
      switch (mode) {
        case 'register':
          await signup(email, password);
          if (await getUser()) window.location.reload();
          else navigate('login', 'Check your email for a confirmation link, then sign in.');
          break;
        case 'forgot':
          await requestPasswordRecovery(email);
          navigate('login', 'If an account exists, you’ll receive a password reset link by email.');
          break;
        case 'reset':
          await recoverPassword(link.token, password);
          navigate('login', 'Your password has been updated. Sign in with your new password.');
          break;
        case 'invite':
          await acceptInvite(link.token, password);
          navigate('login', 'Invitation accepted. Sign in with your new password.');
          break;
        default:
          await login(email, password);
          window.location.reload();
      }
    } catch (failure) {
      if (mode === 'forgot') {
        // Keep the response the same whether the address is registered or unknown.
        navigate('login', 'If an account exists, you’ll receive a password reset link by email.');
      } else {
        setError(failure instanceof Error ? failure.message : 'The request failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (ready && user && !link) {
    return <AccountEmailContext.Provider value={user.email}>{children}</AccountEmailContext.Provider>;
  }

  return <main className="grid min-h-screen place-items-center eldritch-shell px-4 py-10 text-foreground">
    <section className="w-full max-w-md space-y-5 game-panel rounded-lg border border-border bg-card p-6 shadow-lg sm:p-8">
      <header>
        <p className="font-title text-lg text-primary">Eldritch Horrors</p>
        <h1 className="font-title text-3xl">{ready ? titles[mode] : 'Checking your session'}</h1>
      </header>
      {message && <p role="status" className="text-sm">{message}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {ready && <>
        <form key={mode} onSubmit={submit} className="space-y-4">
          {needsEmail && <label className="block space-y-1">
            <span>Email address</span>
            <Input name="email" type="email" autoComplete={mode === 'login' ? 'username' : 'email'} required />
          </label>}
          {mode !== 'forgot' && <label className="block space-y-1">
            <span>{newPassword ? 'New password' : 'Password'}</span>
            <Input name="password" type="password" autoComplete={newPassword ? 'new-password' : 'current-password'}
              minLength={newPassword ? 8 : undefined} required />
          </label>}
          {newPassword && <label className="block space-y-1">
            <span>Confirm password</span>
            <Input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </label>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : titles[mode]}
          </Button>
        </form>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {mode === 'login'
            ? <button type="button" className="underline" disabled={busy} onClick={() => navigate('register')}>Create an account</button>
            : <button type="button" className="underline" disabled={busy} onClick={() => navigate('login')}>Back to sign in</button>}
          {(mode === 'login' || mode === 'reset') &&
            <button type="button" className="underline" disabled={busy} onClick={() => navigate('forgot')}>Forgot password?</button>}
        </div>
      </>}
    </section>
  </main>;
}
