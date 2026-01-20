'use client';

/**
 * Login form component - Passwordless Email Magic Link
 * Two-step flow: 1) Enter email, 2) Check email + resend link
 */

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/contexts';
import './Auth.css';

type Step = 'email' | 'sent';

const LAST_EMAIL_KEY = 'recipe-journal:last-auth-email';
const LAST_EMAIL_AT_KEY = 'recipe-journal:last-auth-email-at';
const LAST_EMAIL_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const SENT_STATE_VISIBLE_MS = 15 * 60 * 1000; // 15 minutes

interface LoginFormProps {
  onSuccess?: () => void;
  initialError?: string;
}

export default function LoginForm({ onSuccess: _onSuccess, initialError }: LoginFormProps) {
  // Magic-link flow completes via redirect to `/auth/callback`, so this is currently unused.
  // Keep the prop for compatibility with callers.
  const { sendOtp, loading } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sentAt, setSentAt] = useState<Date | null>(null);

  // Restore last used email for convenience (and to allow resend after an expired link redirect).
  useEffect(() => {
    try {
      const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
      const lastAtRaw = localStorage.getItem(LAST_EMAIL_AT_KEY);
      const lastAt = lastAtRaw ? Number.parseInt(lastAtRaw, 10) : 0;

      if (
        lastEmail &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lastEmail) &&
        lastAt &&
        Date.now() - lastAt < LAST_EMAIL_MAX_AGE_MS
      ) {
        setEmail((prev) => (prev ? prev : lastEmail));
        // If they just requested a link and refreshed, keep them on the "check your email" step.
        if (Date.now() - lastAt < SENT_STATE_VISIBLE_MS) {
          setStep('sent');
          setSentAt(new Date(lastAt));
          const seconds = Math.floor((Date.now() - lastAt) / 1000);
          setResendCooldown(Math.max(0, 60 - seconds));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (initialError) {
      setError(initialError);

      // If we have a known email, keep the user on the "sent" step so they can resend immediately.
      try {
        const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
        const lastAtRaw = localStorage.getItem(LAST_EMAIL_AT_KEY);
        const lastAt = lastAtRaw ? Number.parseInt(lastAtRaw, 10) : 0;
        if (
          lastEmail &&
          lastAt &&
          Date.now() - lastAt < LAST_EMAIL_MAX_AGE_MS
        ) {
          setEmail(lastEmail);
          setStep('sent');
        } else {
          setStep('email');
        }
      } catch {
        setStep('email');
      }
    }
  }, [initialError]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    const { error: sendError } = await sendOtp(email);

    if (sendError) {
      setError(sendError.message);
    } else {
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email);
        localStorage.setItem(LAST_EMAIL_AT_KEY, Date.now().toString());
      } catch {
        // ignore
      }
      setStep('sent');
      setSentAt(new Date());
      setResendCooldown(60); // 60 seconds cooldown
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setError(null);
    const { error: sendError } = await sendOtp(email);

    if (sendError) {
      setError(sendError.message);
    } else {
      try {
        localStorage.setItem(LAST_EMAIL_KEY, email);
        localStorage.setItem(LAST_EMAIL_AT_KEY, Date.now().toString());
      } catch {
        // ignore
      }
      setResendCooldown(60);
      setSentAt(new Date());
    }
  };

  const handleBack = () => {
    setStep('email');
    setError(null);
  };

  // Step 1: Email entry
  if (step === 'email') {
    return (
      <div className="auth-form">
        <div className="auth-form__header">
          <h1 className="auth-form__title">Welcome</h1>
          <p className="auth-form__subtitle">
            Enter your email to receive a secure sign-in link
          </p>
        </div>

        <form onSubmit={handleEmailSubmit}>
          <div className="auth-form__field">
            <label htmlFor="email" className="auth-form__label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              className={`auth-form__input ${error ? 'auth-form__input--error' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && <p className="auth-form__error" style={{ marginTop: 'var(--spacing-md)' }}>{error}</p>}

          <button
            type="submit"
            className="auth-form__submit"
            disabled={loading || !email.trim()}
            style={{ marginTop: 'var(--spacing-lg)' }}
          >
            {loading ? 'Sending link...' : 'Continue with Email'}
          </button>
        </form>

        <p className="auth-form__footer" style={{ marginTop: 'var(--spacing-lg)' }}>
          No password needed. We&apos;ll email you a one-time sign-in link.
        </p>
      </div>
    );
  }

  // Step 2: Email sent
  return (
    <div className="auth-form">
      <button className="auth-form__back" onClick={handleBack}>
        <svg className="auth-form__back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <div className="auth-form__header">
        <h1 className="auth-form__title">Check your email</h1>
        <p className="auth-form__subtitle">
          Thanks! Please check your email and click the sign-in link to log in.
        </p>
      </div>

      <div className="auth-form__email-display">
        <p className="auth-form__email-display-label">Email sent to</p>
        <p className="auth-form__email-display-value">{email}</p>
      </div>

      {error && <p className="auth-form__error" style={{ marginTop: 'var(--spacing-md)', justifyContent: 'center' }}>{error}</p>}

      {loading && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)' }}>
          Sending...
        </p>
      )}

      <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)' }}>
        Open the email from Recipe Journal and click the sign-in link. If you don&apos;t see it within a minute, check spam/promotions or resend.
      </p>

      {sentAt && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
          Sent {sentAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      )}

      <p className="auth-form__resend" style={{ marginTop: 'var(--spacing-xl)' }}>
        Didn&apos;t receive the email?{' '}
        <button
          className="auth-form__resend-button"
          onClick={handleResendOtp}
          disabled={resendCooldown > 0 || loading}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend link'}
        </button>
      </p>
    </div>
  );
}
