'use client';

/**
 * Auth Context for managing user authentication state with Supabase
 * Uses passwordless Email OTP authentication
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { clearOfflineData } from '@/lib/offline';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  // Passwordless OTP methods
  sendOtp: (email: string) => Promise<{ error: AuthError | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: AuthError | null }>;
  // OAuth methods (alternative login)
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Create a mock error for when Supabase is not configured
const notConfiguredError: AuthError = {
  name: 'AuthError',
  message: 'Supabase is not configured. Please set up environment variables.',
  status: 500,
} as AuthError;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Initialize auth state
  useEffect(() => {
    // Check if Supabase is configured (client-side only)
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);

    if (!supabase || !configured) {
      setLoading(false);
      return;
    }

    // Get initial session
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };
    initSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Send OTP to email (passwordless login)
  const sendOtp = useCallback(async (email: string) => {
    if (!supabase) return { error: notConfiguredError };
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Don't create user if they don't exist - they need to verify first
        shouldCreateUser: true,
        // Use the app callback route so the magic link opens in the current tab and completes login.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    return { error };
  }, [supabase]);

  // Verify OTP code
  const verifyOtp = useCallback(async (email: string, token: string) => {
    if (!supabase) return { error: notConfiguredError };
    setLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    setLoading(false);
    return { error };
  }, [supabase]);

  // Sign in with Google OAuth (alternative)
  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: notConfiguredError };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, [supabase]);

  // Sign out
  const signOut = useCallback(async () => {
    if (!supabase) return { error: notConfiguredError };
    setLoading(true);
    const { error } = await supabase.auth.signOut();

    // Clear offline IndexedDB caches/queues to avoid cross-user contamination on shared devices.
    try {
      await clearOfflineData();
    } catch {
      // ignore
    }

    setLoading(false);
    return { error };
  }, [supabase]);

  const value = {
    user,
    session,
    loading,
    isConfigured,
    sendOtp,
    verifyOtp,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
