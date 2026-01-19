/**
 * SmartScaleToggle Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SmartScaleToggle from './SmartScaleToggle';

describe('SmartScaleToggle', () => {
  const defaultProps = {
    enabled: false,
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the toggle with label', () => {
      render(<SmartScaleToggle {...defaultProps} />);

      expect(screen.getByText('Smart Scale')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('renders the switch button', () => {
      render(<SmartScaleToggle {...defaultProps} />);

      const switchButton = screen.getByRole('switch');
      expect(switchButton).toBeInTheDocument();
    });

    it('shows hint when enabled', () => {
      render(<SmartScaleToggle {...defaultProps} enabled={true} />);

      expect(
        screen.getByText(/AI adds guidance for eggs, spices, and leavening/)
      ).toBeInTheDocument();
    });

    it('does not show hint when disabled', () => {
      render(<SmartScaleToggle {...defaultProps} enabled={false} />);

      expect(
        screen.queryByText(/AI adds guidance/)
      ).not.toBeInTheDocument();
    });
  });

  describe('toggle functionality', () => {
    it('calls onToggle with true when clicked while disabled', () => {
      render(<SmartScaleToggle {...defaultProps} enabled={false} />);

      const switchButton = screen.getByRole('switch');
      fireEvent.click(switchButton);

      expect(defaultProps.onToggle).toHaveBeenCalledWith(true);
    });

    it('calls onToggle with false when clicked while enabled', () => {
      render(<SmartScaleToggle {...defaultProps} enabled={true} />);

      const switchButton = screen.getByRole('switch');
      fireEvent.click(switchButton);

      expect(defaultProps.onToggle).toHaveBeenCalledWith(false);
    });

    it('has correct aria-checked attribute when enabled', () => {
      render(<SmartScaleToggle {...defaultProps} enabled={true} />);

      const switchButton = screen.getByRole('switch');
      expect(switchButton).toHaveAttribute('aria-checked', 'true');
    });

    it('has correct aria-checked attribute when disabled', () => {
      render(<SmartScaleToggle {...defaultProps} enabled={false} />);

      const switchButton = screen.getByRole('switch');
      expect(switchButton).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('disabled state', () => {
    it('does not call onToggle when disabled', () => {
      render(<SmartScaleToggle {...defaultProps} disabled={true} />);

      const switchButton = screen.getByRole('switch');
      fireEvent.click(switchButton);

      expect(defaultProps.onToggle).not.toHaveBeenCalled();
    });

    it('has disabled attribute when disabled', () => {
      render(<SmartScaleToggle {...defaultProps} disabled={true} />);

      const switchButton = screen.getByRole('switch');
      expect(switchButton).toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('does not call onToggle when loading', () => {
      render(<SmartScaleToggle {...defaultProps} loading={true} />);

      const switchButton = screen.getByRole('switch');
      fireEvent.click(switchButton);

      expect(defaultProps.onToggle).not.toHaveBeenCalled();
    });

    it('shows loading hint when loading', () => {
      render(<SmartScaleToggle {...defaultProps} loading={true} enabled={true} />);

      expect(screen.getByText(/AI is scaling your recipe/)).toBeInTheDocument();
    });

    it('has disabled attribute when loading', () => {
      render(<SmartScaleToggle {...defaultProps} loading={true} />);

      const switchButton = screen.getByRole('switch');
      expect(switchButton).toBeDisabled();
    });
  });
});
