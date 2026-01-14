import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtpInput from './OtpInput';

describe('OtpInput', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render 6 input fields by default', () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(6);
    });

    it('should render custom number of input fields', () => {
      render(<OtpInput onComplete={mockOnComplete} length={4} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(4);
    });

    it('should focus first input on mount', () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs[0]).toHaveFocus();
    });

    it('should have correct aria-labels', () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      expect(screen.getByLabelText('Digit 1 of 6')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 6 of 6')).toBeInTheDocument();
    });
  });

  describe('input behavior', () => {
    it('should move focus to next input on entry', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      await userEvent.type(inputs[0], '1');

      expect(inputs[1]).toHaveFocus();
    });

    it('should move focus to previous on backspace when empty', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      // Type in first two inputs
      await userEvent.type(inputs[0], '1');
      await userEvent.type(inputs[1], '2');

      // Clear second input and press backspace
      await userEvent.clear(inputs[1]);
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });

      expect(inputs[0]).toHaveFocus();
    });

    it('should only accept numeric input', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      await userEvent.type(inputs[0], 'a');
      expect(inputs[0]).toHaveValue('');

      await userEvent.type(inputs[0], '1');
      expect(inputs[0]).toHaveValue('1');
    });

    it('should navigate with arrow keys', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      // Focus first, type, then use arrow keys
      await userEvent.type(inputs[0], '1');
      expect(inputs[1]).toHaveFocus();

      fireEvent.keyDown(inputs[1], { key: 'ArrowLeft' });
      expect(inputs[0]).toHaveFocus();

      fireEvent.keyDown(inputs[0], { key: 'ArrowRight' });
      expect(inputs[1]).toHaveFocus();
    });
  });

  describe('completion', () => {
    it('should call onComplete when all digits entered', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      for (let i = 0; i < 6; i++) {
        await userEvent.type(inputs[i], String(i + 1));
      }

      expect(mockOnComplete).toHaveBeenCalledWith('123456');
    });

    it('should not call onComplete when digits are missing', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      // Only type 5 digits
      for (let i = 0; i < 5; i++) {
        await userEvent.type(inputs[i], String(i + 1));
      }

      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('paste functionality', () => {
    it('should handle paste of full code', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      // Simulate paste event
      fireEvent.paste(inputs[0], {
        clipboardData: {
          getData: () => '123456',
        },
      });

      expect(inputs[0]).toHaveValue('1');
      expect(inputs[1]).toHaveValue('2');
      expect(inputs[2]).toHaveValue('3');
      expect(inputs[3]).toHaveValue('4');
      expect(inputs[4]).toHaveValue('5');
      expect(inputs[5]).toHaveValue('6');

      expect(mockOnComplete).toHaveBeenCalledWith('123456');
    });

    it('should handle paste of partial code', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      fireEvent.paste(inputs[0], {
        clipboardData: {
          getData: () => '123',
        },
      });

      expect(inputs[0]).toHaveValue('1');
      expect(inputs[1]).toHaveValue('2');
      expect(inputs[2]).toHaveValue('3');
      expect(inputs[3]).toHaveValue('');

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('should reject non-numeric paste', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      fireEvent.paste(inputs[0], {
        clipboardData: {
          getData: () => 'abcdef',
        },
      });

      expect(inputs[0]).toHaveValue('');
      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable all inputs when disabled prop is true', () => {
      render(<OtpInput onComplete={mockOnComplete} disabled />);

      const inputs = screen.getAllByRole('textbox');

      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('error state', () => {
    it('should show error state when error prop is true', () => {
      render(<OtpInput onComplete={mockOnComplete} error />);

      const inputs = screen.getAllByRole('textbox');

      inputs.forEach((input) => {
        expect(input).toHaveClass('otp-input-box--error');
      });
    });

    it('should not show error state by default', () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      inputs.forEach((input) => {
        expect(input).not.toHaveClass('otp-input-box--error');
      });
    });
  });

  describe('filled state', () => {
    it('should show filled state when digit is entered', async () => {
      render(<OtpInput onComplete={mockOnComplete} />);

      const inputs = screen.getAllByRole('textbox');

      await userEvent.type(inputs[0], '1');

      expect(inputs[0]).toHaveClass('otp-input-box--filled');
      expect(inputs[1]).not.toHaveClass('otp-input-box--filled');
    });
  });
});
