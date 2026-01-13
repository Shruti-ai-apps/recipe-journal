'use client';

/**
 * Login form component - Passwordless Email OTP
 * Two-step flow: 1) Enter email, 2) Enter OTP code
 */

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/contexts';
import OtpInput from './OtpInput';
import './Auth.css';

type Step = 'email' | 'otp';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const { sendOtp, verifyOtp, signInWithGoogle, loading } = useAuth();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

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
      setStep('otp');
      setResendCooldown(60); // 60 seconds cooldown
    }
  };

  const handleOtpComplete = async (otp: string) => {
    setError(null);

    const { error: verifyError } = await verifyOtp(email, otp);

    if (verifyError) {
      setError('Invalid or expired code. Please try again.');
    } else {
      onSuccess?.();
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setError(null);
    const { error: sendError } = await sendOtp(email);

    if (sendError) {
      setError(sendError.message);
    } else {
      setResendCooldown(60);
    }
  };

  const handleGoogleLogin = async () => {
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError.message);
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
            Enter your email to receive a sign-in code
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
            {loading ? 'Sending code...' : 'Continue with Email'}
          </button>
        </form>

        <div className="auth-form__divider">or</div>

        <button
          type="button"
          className="social-button social-button--google"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <svg className="social-button__icon" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="auth-form__footer" style={{ marginTop: 'var(--spacing-lg)' }}>
          No password needed. We&apos;ll send you a 6-digit code.
        </p>
      </div>
    );
  }

  // Step 2: OTP verification
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
          Enter the 6-digit code we sent to
        </p>
      </div>

      <div className="auth-form__email-display">
        <p className="auth-form__email-display-label">Code sent to</p>
        <p className="auth-form__email-display-value">{email}</p>
      </div>

      <OtpInput
        onComplete={handleOtpComplete}
        disabled={loading}
        error={!!error}
      />

      {error && <p className="auth-form__error" style={{ marginTop: 'var(--spacing-md)', justifyContent: 'center' }}>{error}</p>}

      {loading && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-md)' }}>
          Verifying...
        </p>
      )}

      <p className="auth-form__resend" style={{ marginTop: 'var(--spacing-xl)' }}>
        Didn&apos;t receive the code?{' '}
        <button
          className="auth-form__resend-button"
          onClick={handleResendOtp}
          disabled={resendCooldown > 0 || loading}
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
      </p>
    </div>
  );
}
