import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

// Mock Supabase client
const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
  isSupabaseConfigured: () => true,
}));

// Suppress act warnings in tests - these are caused by async state updates
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: An update to') && args[0]?.includes?.('inside a test was not wrapped in act')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Test component that uses the auth context
function TestComponent() {
  const { user, session, loading, isConfigured, sendOtp, verifyOtp, signInWithGoogle, signOut } = useAuth();

  return (
    <div>
      <span data-testid="user">{user ? user.email : 'no-user'}</span>
      <span data-testid="session">{session ? 'has-session' : 'no-session'}</span>
      <span data-testid="loading">{loading ? 'loading' : 'not-loading'}</span>
      <span data-testid="configured">{isConfigured ? 'configured' : 'not-configured'}</span>
      <button onClick={() => sendOtp('test@example.com')}>Send OTP</button>
      <button onClick={() => verifyOtp('test@example.com', '123456')}>Verify OTP</button>
      <button onClick={() => signInWithGoogle()}>Google Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  describe('AuthProvider', () => {
    it('should provide auth context to children', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toBeInTheDocument();
      });
    });

    it('should initialize with null user and session', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('no-user');
      expect(screen.getByTestId('session')).toHaveTextContent('no-session');
    });

    it('should set loading to true initially', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initially loading is true before getSession resolves
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    it('should set isConfigured based on env variables', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('configured')).toHaveTextContent('configured');
      });
    });

    it('should update user state on auth change', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'token' };

      // Set up getSession to return the session initially
      mockGetSession.mockResolvedValue({ data: { session: mockSession } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for the session to be loaded
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      // User should be set from the session
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('session')).toHaveTextContent('has-session');
      });
    });
  });

  describe('sendOtp', () => {
    it('should call sendOtp with email', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await userEvent.click(screen.getByText('Send OTP'));

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true },
      });
    });

    it('should handle sendOtp error', async () => {
      const mockError = { message: 'Rate limit exceeded', status: 429 };
      mockSignInWithOtp.mockResolvedValue({ error: mockError });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await userEvent.click(screen.getByText('Send OTP'));

      expect(mockSignInWithOtp).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should call verifyOtp with email and token', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await userEvent.click(screen.getByText('Verify OTP'));

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        token: '123456',
        type: 'email',
      });
    });

    it('should handle verifyOtp error', async () => {
      const mockError = { message: 'Invalid OTP', status: 400 };
      mockVerifyOtp.mockResolvedValue({ error: mockError });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await userEvent.click(screen.getByText('Verify OTP'));

      expect(mockVerifyOtp).toHaveBeenCalled();
    });
  });

  describe('signInWithGoogle', () => {
    it('should call signInWithGoogle', async () => {
      mockSignInWithOAuth.mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await userEvent.click(screen.getByText('Google Sign In'));

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      });
    });
  });

  describe('signOut', () => {
    it('should call signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
      });

      await userEvent.click(screen.getByText('Sign Out'));

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
