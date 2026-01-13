'use client';

/**
 * Forgot Password page - Redirects to login (not needed with passwordless)
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    // With passwordless OTP, there's no password to forget
    router.replace('/login');
  }, [router]);

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
