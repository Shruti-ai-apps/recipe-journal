import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScalingControls from './ScalingControls';

describe('ScalingControls', () => {
  const mockOnScale = jest.fn();

  beforeEach(() => {
    mockOnScale.mockClear();
  });

  describe('rendering', () => {
    it('renders preset multiplier buttons', () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      const buttons = screen.getAllByRole('button');
      const buttonTexts = buttons.map((btn) => btn.textContent);

      expect(buttonTexts).toContain('1/2x');
      expect(buttonTexts).toContain('1x');
      expect(buttonTexts).toContain('2x');
      expect(buttonTexts).toContain('3x');
    });

    it('renders custom button', () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('displays current multiplier', () => {
      render(<ScalingControls currentMultiplier={2} onScale={mockOnScale} />);

      // The current multiplier is shown in a strong element inside current-scale div
      expect(screen.getByText('Current:')).toBeInTheDocument();
      // Find the strong element containing the multiplier text
      const currentScaleDiv = screen.getByText('Current:').closest('.current-scale');
      expect(currentScaleDiv).toHaveTextContent('2x');
    });

    it('highlights active multiplier button', () => {
      render(<ScalingControls currentMultiplier={2} onScale={mockOnScale} />);

      // Find all buttons, filter to the one that says "2x"
      const buttons = screen.getAllByRole('button');
      const activeButton = buttons.find((btn) => btn.textContent === '2x');
      expect(activeButton).toHaveClass('scale-button--active');
    });

    it('renders scaling label', () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      expect(screen.getByText('Scale recipe:')).toBeInTheDocument();
    });
  });

  describe('preset button interactions', () => {
    it('calls onScale with 0.5 when half button clicked', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('1/2x'));

      expect(mockOnScale).toHaveBeenCalledWith(0.5);
    });

    it('calls onScale with 1 when 1x button clicked', async () => {
      render(<ScalingControls currentMultiplier={2} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('1x'));

      expect(mockOnScale).toHaveBeenCalledWith(1);
    });

    it('calls onScale with 2 when double button clicked', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('2x'));

      expect(mockOnScale).toHaveBeenCalledWith(2);
    });

    it('calls onScale with 3 when triple button clicked', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('3x'));

      expect(mockOnScale).toHaveBeenCalledWith(3);
    });
  });

  describe('custom input', () => {
    it('shows custom input when Custom button clicked', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));

      expect(screen.getByPlaceholderText('Enter multiplier')).toBeInTheDocument();
      expect(screen.getByText('Apply')).toBeInTheDocument();
    });

    it('hides custom input when Custom button clicked again', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      await userEvent.click(screen.getByText('Custom'));

      expect(screen.queryByPlaceholderText('Enter multiplier')).not.toBeInTheDocument();
    });

    it('calls onScale with custom value when Apply clicked', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');
      await userEvent.type(input, '1.5');
      await userEvent.click(screen.getByText('Apply'));

      expect(mockOnScale).toHaveBeenCalledWith(1.5);
    });

    it('calls onScale when Enter pressed in custom input', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');
      await userEvent.type(input, '2.5{enter}');

      expect(mockOnScale).toHaveBeenCalledWith(2.5);
    });

    it('does not call onScale for invalid custom value', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');
      await userEvent.type(input, 'abc');
      await userEvent.click(screen.getByText('Apply'));

      expect(mockOnScale).not.toHaveBeenCalled();
    });

    it('does not call onScale for value <= 0', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');
      await userEvent.type(input, '-1');
      await userEvent.click(screen.getByText('Apply'));

      expect(mockOnScale).not.toHaveBeenCalled();
    });

    it('does not call onScale for value > 10', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');
      await userEvent.type(input, '15');
      await userEvent.click(screen.getByText('Apply'));

      expect(mockOnScale).not.toHaveBeenCalled();
    });

    it('hides custom input when preset button clicked', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      expect(screen.getByPlaceholderText('Enter multiplier')).toBeInTheDocument();

      await userEvent.click(screen.getByText('2x'));

      expect(screen.queryByPlaceholderText('Enter multiplier')).not.toBeInTheDocument();
    });

    it('clears custom value when preset button clicked', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');
      await userEvent.type(input, '1.5');
      await userEvent.click(screen.getByText('2x'));
      await userEvent.click(screen.getByText('Custom'));

      const newInput = screen.getByPlaceholderText('Enter multiplier');
      expect(newInput).toHaveValue(null);
    });
  });

  describe('disabled state', () => {
    it('disables all preset buttons when disabled prop is true', () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} disabled />);

      const buttons = screen.getAllByRole('button');
      // All buttons should be disabled
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('disables custom input when disabled prop is true', async () => {
      const { rerender } = render(
        <ScalingControls currentMultiplier={1} onScale={mockOnScale} />
      );

      await userEvent.click(screen.getByText('Custom'));

      rerender(<ScalingControls currentMultiplier={1} onScale={mockOnScale} disabled />);

      expect(screen.getByPlaceholderText('Enter multiplier')).toBeDisabled();
      expect(screen.getByText('Apply')).toBeDisabled();
    });

    it('does not call onScale when buttons clicked while disabled', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} disabled />);

      // fireEvent works even on disabled buttons, but the handler shouldn't fire
      fireEvent.click(screen.getByText('2x'));

      expect(mockOnScale).not.toHaveBeenCalled();
    });
  });

  describe('input constraints', () => {
    it('has correct min value on custom input', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');

      expect(input).toHaveAttribute('min', '0.1');
    });

    it('has correct max value on custom input', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');

      expect(input).toHaveAttribute('max', '10');
    });

    it('has correct step value on custom input', async () => {
      render(<ScalingControls currentMultiplier={1} onScale={mockOnScale} />);

      await userEvent.click(screen.getByText('Custom'));
      const input = screen.getByPlaceholderText('Enter multiplier');

      expect(input).toHaveAttribute('step', '0.1');
    });
  });
});
