'use client';

/**
 * Login page - Passwordless Email OTP
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoginForm } from '@/components/auth';
import { useAuth } from '@/contexts';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
      <LoginForm onSuccess={() => router.push('/')} />
    </main>
  );
}
