'use client';

/**
 * Login page - Passwordless Email OTP
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth';
import { useAuth } from '@/contexts';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get('error_code');
  const errorDescription = searchParams.get('error_description');

  const authErrorMessage = (() => {
    if (!errorCode && !errorDescription) return undefined;

    if (errorCode === 'otp_expired') {
      return 'That sign-in link has expired. Please request a new link and click the latest email.';
    }

    return errorDescription
      ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
      : 'Sign-in failed. Please try again.';
  })();

  // Redirect if already logged in
  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Show nothing while checking auth state
  if (loading || user) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh'
      }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <main style={{
      padding: 'var(--spacing-2xl) var(--spacing-lg)',
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <LoginForm onSuccess={() => router.push('/')} initialError={authErrorMessage} />
    </main>
  );
}
