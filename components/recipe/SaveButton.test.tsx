import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SaveButton from './SaveButton';
import { Recipe } from '@/types';
import * as favoritesService from '../../services/favorites';

// Mock the favorites service
jest.mock('../../services/favorites', () => ({
  isFavorite: jest.fn(),
  saveFavorite: jest.fn(),
  removeFavoriteByUrl: jest.fn(),
}));

const mockIsFavorite = favoritesService.isFavorite as jest.Mock;
const mockSaveFavorite = favoritesService.saveFavorite as jest.Mock;
const mockRemoveFavoriteByUrl = favoritesService.removeFavoriteByUrl as jest.Mock;

describe('SaveButton', () => {
  const mockRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Test Recipe',
    servings: { amount: 4, unit: 'servings', originalText: '4 servings' },
    ingredients: [],
    instructions: [],
    source: {
      url: 'https://example.com/recipe',
      domain: 'example.com',
      scrapedAt: new Date(),
      scrapeMethod: 'schema-org',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFavorite.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('renders save button with label by default', () => {
      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('renders without label when showLabel is false', () => {
      render(<SaveButton recipe={mockRecipe} showLabel={false} />);

      expect(screen.queryByText('Save')).not.toBeInTheDocument();
    });

    it('shows "Saved" label when recipe is favorited', () => {
      mockIsFavorite.mockReturnValue(true);

      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('applies correct size class', () => {
      const { rerender } = render(<SaveButton recipe={mockRecipe} size="small" />);
      expect(screen.getByRole('button')).toHaveClass('save-button--small');

      rerender(<SaveButton recipe={mockRecipe} size="large" />);
      expect(screen.getByRole('button')).toHaveClass('save-button--large');
    });

    it('applies saved class when favorited', () => {
      mockIsFavorite.mockReturnValue(true);

      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByRole('button')).toHaveClass('save-button--saved');
    });
  });

  describe('accessibility', () => {
    it('has correct aria-label when not saved', () => {
      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Save to favorites');
    });

    it('has correct aria-label when saved', () => {
      mockIsFavorite.mockReturnValue(true);

      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Remove from favorites');
    });

    it('has correct title when not saved', () => {
      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByRole('button')).toHaveAttribute('title', 'Save to favorites');
    });

    it('has correct title when saved', () => {
      mockIsFavorite.mockReturnValue(true);

      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByRole('button')).toHaveAttribute('title', 'Remove from favorites');
    });
  });

  describe('save functionality', () => {
    it('saves recipe when clicked while not favorited', async () => {
      render(<SaveButton recipe={mockRecipe} />);

      await userEvent.click(screen.getByRole('button'));

      expect(mockSaveFavorite).toHaveBeenCalledWith(mockRecipe, { multiplier: undefined });
    });

    it('passes multiplier when saving', async () => {
      render(<SaveButton recipe={mockRecipe} multiplier={2} />);

      await userEvent.click(screen.getByRole('button'));

      expect(mockSaveFavorite).toHaveBeenCalledWith(mockRecipe, { multiplier: 2 });
    });

    it('calls onSaveChange with true when saving', async () => {
      const mockOnSaveChange = jest.fn();
      render(<SaveButton recipe={mockRecipe} onSaveChange={mockOnSaveChange} />);

      await userEvent.click(screen.getByRole('button'));

      expect(mockOnSaveChange).toHaveBeenCalledWith(true);
    });

    it('updates label to "Saved" after saving', async () => {
      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByText('Save')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  describe('remove functionality', () => {
    it('removes recipe when clicked while favorited', async () => {
      mockIsFavorite.mockReturnValue(true);

      render(<SaveButton recipe={mockRecipe} />);

      await userEvent.click(screen.getByRole('button'));

      expect(mockRemoveFavoriteByUrl).toHaveBeenCalledWith('https://example.com/recipe');
    });

    it('calls onSaveChange with false when removing', async () => {
      mockIsFavorite.mockReturnValue(true);
      const mockOnSaveChange = jest.fn();

      render(<SaveButton recipe={mockRecipe} onSaveChange={mockOnSaveChange} />);

      await userEvent.click(screen.getByRole('button'));

      expect(mockOnSaveChange).toHaveBeenCalledWith(false);
    });

    it('updates label to "Save" after removing', async () => {
      mockIsFavorite.mockReturnValue(true);

      render(<SaveButton recipe={mockRecipe} />);

      expect(screen.getByText('Saved')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button'));

      expect(screen.getByText('Save')).toBeInTheDocument();
    });
  });

  describe('animation', () => {
    it('applies animating class temporarily on click', async () => {
      jest.useFakeTimers();
      render(<SaveButton recipe={mockRecipe} />);

      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('button')).toHaveClass('save-button--animating');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      expect(screen.getByRole('button')).not.toHaveClass('save-button--animating');

      jest.useRealTimers();
    });
  });

  describe('initial state based on favorites', () => {
    it('checks if recipe is already favorited on mount', () => {
      render(<SaveButton recipe={mockRecipe} />);

      expect(mockIsFavorite).toHaveBeenCalledWith('https://example.com/recipe');
    });

    it('updates state when recipe prop changes', () => {
      const { rerender } = render(<SaveButton recipe={mockRecipe} />);

      const newRecipe = {
        ...mockRecipe,
        source: { ...mockRecipe.source, url: 'https://example.com/new-recipe' },
      };

      rerender(<SaveButton recipe={newRecipe} />);

      expect(mockIsFavorite).toHaveBeenCalledWith('https://example.com/new-recipe');
    });
  });
});
