'use client';

/**
 * Signup page - Redirects to login (OTP handles both)
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // With passwordless OTP, signup and login are the same flow
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
