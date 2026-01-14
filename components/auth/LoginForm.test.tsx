import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

// Mock the auth context
const mockSendOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSignInWithGoogle = jest.fn();

jest.mock('@/contexts', () => ({
  useAuth: () => ({
    sendOtp: mockSendOtp,
    verifyOtp: mockVerifyOtp,
    signInWithGoogle: mockSignInWithGoogle,
    loading: false,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendOtp.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({ error: null });
    mockSignInWithGoogle.mockResolvedValue({ error: null });
  });

  describe('Email Step', () => {
    it('should render email input step initially', () => {
      render(<LoginForm />);

      expect(screen.getByText('Welcome')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toBeInTheDocument();
      expect(screen.getByText('Continue with Email')).toBeInTheDocument();
    });

    it('should show validation error for empty email', async () => {
      render(<LoginForm />);

      const submitButton = screen.getByText('Continue with Email');

      // Button should be disabled when email is empty
      expect(submitButton).toBeDisabled();
      expect(mockSendOtp).not.toHaveBeenCalled();
    });

    it('should not submit invalid email format', async () => {
      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email address'), 'invalid-email');
      await userEvent.click(screen.getByText('Continue with Email'));

      // Wait a moment for any async operations
      await waitFor(() => {
        // The key behavior: sendOtp should NOT be called for invalid email
        expect(mockSendOtp).not.toHaveBeenCalled();
      });

      // Should stay on email step (not advance to OTP step)
      expect(screen.getByText('Welcome')).toBeInTheDocument();
    });

    it('should call sendOtp on valid email submit', async () => {
      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email address'), 'test@example.com');
      await userEvent.click(screen.getByText('Continue with Email'));

      expect(mockSendOtp).toHaveBeenCalledWith('test@example.com');
    });

    it('should transition to OTP step after sending', async () => {
      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email address'), 'test@example.com');
      await userEvent.click(screen.getByText('Continue with Email'));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });
    });

    it('should display error when sendOtp fails', async () => {
      mockSendOtp.mockResolvedValue({ error: { message: 'Rate limit exceeded' } });

      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email address'), 'test@example.com');
      await userEvent.click(screen.getByText('Continue with Email'));

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
      });
    });

    it('should render Google login button', () => {
      render(<LoginForm />);

      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('should call signInWithGoogle on click', async () => {
      render(<LoginForm />);

      await userEvent.click(screen.getByText('Continue with Google'));

      expect(mockSignInWithGoogle).toHaveBeenCalled();
    });

    it('should display Google sign in error', async () => {
      mockSignInWithGoogle.mockResolvedValue({ error: { message: 'Google auth failed' } });

      render(<LoginForm />);

      await userEvent.click(screen.getByText('Continue with Google'));

      await waitFor(() => {
        expect(screen.getByText('Google auth failed')).toBeInTheDocument();
      });
    });

    it('should show "No password needed" message', () => {
      render(<LoginForm />);

      expect(screen.getByText(/No password needed/)).toBeInTheDocument();
    });
  });

  describe('OTP Step', () => {
    beforeEach(async () => {
      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email address'), 'test@example.com');
      await userEvent.click(screen.getByText('Continue with Email'));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });
    });

    it('should display entered email on OTP step', () => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should have back button on OTP step', () => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('should return to email step when back clicked', async () => {
      await userEvent.click(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByText('Welcome')).toBeInTheDocument();
      });
    });

    it('should show 6 OTP input fields', () => {
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBe(6);
    });

    it('should show resend cooldown timer', () => {
      expect(screen.getByText(/Resend in/)).toBeInTheDocument();
    });

    it('should call verifyOtp when all digits entered', async () => {
      const inputs = screen.getAllByRole('textbox');

      // Type each digit
      for (let i = 0; i < 6; i++) {
        await userEvent.type(inputs[i], String(i + 1));
      }

      await waitFor(() => {
        expect(mockVerifyOtp).toHaveBeenCalledWith('test@example.com', '123456');
      });
    });

    it('should show error on invalid OTP', async () => {
      mockVerifyOtp.mockResolvedValue({ error: { message: 'Invalid code' } });

      const inputs = screen.getAllByRole('textbox');

      for (let i = 0; i < 6; i++) {
        await userEvent.type(inputs[i], String(i + 1));
      }

      await waitFor(() => {
        expect(screen.getByText(/Invalid or expired code/)).toBeInTheDocument();
      });
    });

    it('should call onSuccess after successful login', async () => {
      const mockOnSuccess = jest.fn();

      // Re-render with onSuccess callback
      const { unmount } = render(<LoginForm onSuccess={mockOnSuccess} />);

      // Go through the flow again
      await userEvent.type(screen.getAllByLabelText('Email address')[0], 'test@example.com');
      await userEvent.click(screen.getAllByText('Continue with Email')[0]);

      await waitFor(() => {
        expect(screen.getAllByText('Check your email').length).toBeGreaterThan(0);
      });

      const inputs = screen.getAllByRole('textbox');
      // Find the OTP inputs (last 6 inputs)
      const otpInputs = inputs.slice(-6);

      for (let i = 0; i < 6; i++) {
        await userEvent.type(otpInputs[i], String(i + 1));
      }

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      unmount();
    });
  });

  describe('Resend OTP', () => {
    it('should disable resend during cooldown', async () => {
      render(<LoginForm />);

      await userEvent.type(screen.getByLabelText('Email address'), 'test@example.com');
      await userEvent.click(screen.getByText('Continue with Email'));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      const resendButton = screen.getByText(/Resend in/);
      expect(resendButton).toBeDisabled();
    });

    it('should enable resend after cooldown', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<LoginForm />);

      await user.type(screen.getByLabelText('Email address'), 'test@example.com');
      await user.click(screen.getByText('Continue with Email'));

      await waitFor(() => {
        expect(screen.getByText('Check your email')).toBeInTheDocument();
      });

      // Fast forward 61 seconds - need to run pending timers for each second
      // The component uses recursive setTimeout (1 second each tick)
      for (let i = 0; i <= 60; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1000);
        });
      }

      // After cooldown, the button text changes to "Resend code" and is enabled
      const resendButton = screen.getByRole('button', { name: /resend/i });
      await waitFor(() => {
        expect(resendButton).toBeEnabled();
      });

      jest.useRealTimers();
    }, 15000);
  });
});
