import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UrlInput from './UrlInput';

// Mock clipboard API
const mockClipboard = {
  readText: jest.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('UrlInput', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockClipboard.readText.mockClear();
  });

  describe('rendering', () => {
    it('renders input field with placeholder', () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Recipe URL');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'https://www.allrecipes.com/recipe/...');
    });

    it('renders submit button', () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Get Recipe')).toBeInTheDocument();
    });

    it('renders paste button', () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      expect(screen.getByTitle('Paste from clipboard')).toBeInTheDocument();
    });

    it('renders hint text', () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      expect(
        screen.getByText(/Paste a link from your favorite recipe site/i)
      ).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls onSubmit with valid URL', async () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Recipe URL');
      await userEvent.type(input, 'https://example.com/recipe');
      await userEvent.click(screen.getByText('Get Recipe'));

      expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com/recipe');
    });

    it('submits on Enter key press', async () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Recipe URL');
      await userEvent.type(input, 'https://example.com/recipe{enter}');

      expect(mockOnSubmit).toHaveBeenCalledWith('https://example.com/recipe');
    });
  });

  describe('validation', () => {
    it('shows error for empty URL on submit', async () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      // Need to have some text first, then clear it, then submit
      const input = screen.getByLabelText('Recipe URL');
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: '' } });

      // Submit with empty input by submitting the form directly
      const form = input.closest('form')!;
      fireEvent.submit(form);

      expect(screen.getByText('Please enter a URL')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error for invalid URL', async () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Recipe URL');
      fireEvent.change(input, { target: { value: 'not-a-valid-url' } });

      // Submit the form directly
      const form = input.closest('form')!;
      fireEvent.submit(form);

      expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows error for non-HTTP URL', async () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Recipe URL');
      await userEvent.type(input, 'ftp://example.com/recipe');
      await userEvent.click(screen.getByText('Get Recipe'));

      expect(screen.getByText('Please enter a valid HTTP or HTTPS URL')).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('clears error when typing', async () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Recipe URL');
      fireEvent.change(input, { target: { value: 'invalid' } });

      // Submit the form directly to trigger validation
      const form = input.closest('form')!;
      fireEvent.submit(form);

      expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();

      fireEvent.change(input, { target: { value: 'invalidx' } });

      expect(screen.queryByText('Please enter a valid URL')).not.toBeInTheDocument();
    });

    it('sets aria-invalid when there is an error', async () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Recipe URL');
      fireEvent.change(input, { target: { value: 'invalid' } });

      // Submit the form directly to trigger validation
      const form = input.closest('form')!;
      fireEvent.submit(form);

      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('paste functionality', () => {
    it('pastes from clipboard when paste button clicked', async () => {
      mockClipboard.readText.mockResolvedValue('https://example.com/pasted-recipe');

      render(<UrlInput onSubmit={mockOnSubmit} />);

      await userEvent.click(screen.getByTitle('Paste from clipboard'));

      await waitFor(() => {
        expect(screen.getByLabelText('Recipe URL')).toHaveValue('https://example.com/pasted-recipe');
      });
    });

    it('handles clipboard access denied gracefully', async () => {
      mockClipboard.readText.mockRejectedValue(new Error('Clipboard access denied'));

      render(<UrlInput onSubmit={mockOnSubmit} />);

      // Should not throw
      await userEvent.click(screen.getByTitle('Paste from clipboard'));

      expect(screen.getByLabelText('Recipe URL')).toHaveValue('');
    });
  });

  describe('disabled state', () => {
    it('disables input when disabled prop is true', () => {
      render(<UrlInput onSubmit={mockOnSubmit} disabled />);

      expect(screen.getByLabelText('Recipe URL')).toBeDisabled();
    });

    it('disables submit button when disabled prop is true', () => {
      render(<UrlInput onSubmit={mockOnSubmit} disabled />);

      expect(screen.getByText('Loading...')).toBeDisabled();
    });

    it('shows Loading... text when disabled', () => {
      render(<UrlInput onSubmit={mockOnSubmit} disabled />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('disables paste button when disabled prop is true', () => {
      render(<UrlInput onSubmit={mockOnSubmit} disabled />);

      expect(screen.getByTitle('Paste from clipboard')).toBeDisabled();
    });

    it('disables submit button when input is empty', () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Get Recipe')).toBeDisabled();
    });

    it('enables submit button when input has value', async () => {
      render(<UrlInput onSubmit={mockOnSubmit} />);

      const input = screen.getByLabelText('Recipe URL');
      await userEvent.type(input, 'https://example.com');

      expect(screen.getByText('Get Recipe')).not.toBeDisabled();
    });
  });
});
