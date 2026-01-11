import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders input field', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.getByLabelText('Search recipes')).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.getByPlaceholderText('Search recipes...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<SearchBar onSearch={mockOnSearch} placeholder="Find a recipe..." />);

      expect(screen.getByPlaceholderText('Find a recipe...')).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(<SearchBar onSearch={mockOnSearch} />);

      expect(container.querySelector('.search-bar__icon')).toBeInTheDocument();
    });
  });

  describe('search functionality', () => {
    it('calls onSearch after debounce delay', async () => {
      jest.useFakeTimers();
      render(<SearchBar onSearch={mockOnSearch} debounceMs={300} />);

      const input = screen.getByLabelText('Search recipes');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'chocolate' } });
      });

      expect(mockOnSearch).not.toHaveBeenCalledWith('chocolate');

      await act(async () => {
        jest.advanceTimersByTime(300);
      });

      expect(mockOnSearch).toHaveBeenCalledWith('chocolate');
      jest.useRealTimers();
    });

    it('uses custom debounce delay', async () => {
      jest.useFakeTimers();
      render(<SearchBar onSearch={mockOnSearch} debounceMs={500} />);

      const input = screen.getByLabelText('Search recipes');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cake' } });
      });

      await act(async () => {
        jest.advanceTimersByTime(300);
      });
      expect(mockOnSearch).not.toHaveBeenCalledWith('cake');

      await act(async () => {
        jest.advanceTimersByTime(200);
      });
      expect(mockOnSearch).toHaveBeenCalledWith('cake');
      jest.useRealTimers();
    });
  });

  describe('clear functionality', () => {
    it('does not show clear button when input is empty', () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('shows clear button when input has value', async () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByLabelText('Search recipes');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'test' } });
      });

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('clears input when clear clicked', async () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByLabelText('Search recipes');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'test' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Clear search'));
      });

      expect(input).toHaveValue('');
      expect(mockOnSearch).toHaveBeenCalledWith('');
    });

    it('hides clear button after clearing', async () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByLabelText('Search recipes');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'test' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText('Clear search'));
      });

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });
  });

  describe('controlled input', () => {
    it('updates value as user types', async () => {
      render(<SearchBar onSearch={mockOnSearch} />);

      const input = screen.getByLabelText('Search recipes');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'cookies' } });
      });

      expect(input).toHaveValue('cookies');
    });
  });
});
