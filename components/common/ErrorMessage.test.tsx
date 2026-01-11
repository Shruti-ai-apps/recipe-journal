import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorMessage from './ErrorMessage';

describe('ErrorMessage', () => {
  describe('rendering', () => {
    it('renders the error message text', () => {
      render(<ErrorMessage message="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('has role="alert" for accessibility', () => {
      render(<ErrorMessage message="Error occurred" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders error icon', () => {
      const { container } = render(<ErrorMessage message="Error" />);
      const svg = container.querySelector('svg.error-icon');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('dismiss button', () => {
    it('renders dismiss button when onDismiss is provided', () => {
      const mockDismiss = jest.fn();
      render(<ErrorMessage message="Error" onDismiss={mockDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss error');
      expect(dismissButton).toBeInTheDocument();
    });

    it('does not render dismiss button when onDismiss is not provided', () => {
      render(<ErrorMessage message="Error" />);

      expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
    });

    it('calls onDismiss when dismiss button is clicked', async () => {
      const mockDismiss = jest.fn();
      render(<ErrorMessage message="Error" onDismiss={mockDismiss} />);

      const dismissButton = screen.getByLabelText('Dismiss error');
      await userEvent.click(dismissButton);

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('various message types', () => {
    it('renders long error messages', () => {
      const longMessage =
        'This is a very long error message that explains in detail what went wrong and how the user might fix the issue';
      render(<ErrorMessage message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('renders error messages with special characters', () => {
      const messageWithSpecialChars = 'Error: URL "https://example.com" is invalid!';
      render(<ErrorMessage message={messageWithSpecialChars} />);
      expect(screen.getByText(messageWithSpecialChars)).toBeInTheDocument();
    });

    it('renders empty message', () => {
      render(<ErrorMessage message="" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
