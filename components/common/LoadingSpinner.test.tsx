import { render, screen } from '@testing-library/react';
import LoadingSpinner from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingSpinner message="Fetching recipe..." />);

    expect(screen.getByText('Fetching recipe...')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { container, rerender } = render(<LoadingSpinner size="small" />);
    expect(container.firstChild).toHaveClass('loading-spinner--small');

    rerender(<LoadingSpinner size="large" />);
    expect(container.firstChild).toHaveClass('loading-spinner--large');
  });

  it('does not render message when empty string provided', () => {
    render(<LoadingSpinner message="" />);

    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });
});
