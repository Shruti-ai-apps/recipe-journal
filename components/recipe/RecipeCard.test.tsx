import { render, screen } from '@testing-library/react';
import RecipeCard from './RecipeCard';
import { Recipe } from '@/types';

describe('RecipeCard', () => {
  const mockRecipe: Recipe = {
    id: 'recipe-1',
    title: 'Chocolate Chip Cookies',
    description: 'Delicious homemade cookies',
    author: 'Test Chef',
    image: 'https://example.com/image.jpg',
    prepTime: 15,
    cookTime: 12,
    totalTime: 27,
    servings: {
      amount: 24,
      unit: 'cookies',
      originalText: 'Makes 24 cookies',
    },
    tags: ['dessert', 'baking', 'cookies'],
    ingredients: [],
    instructions: [],
    source: {
      url: 'https://example.com/recipe',
      domain: 'example.com',
      scrapedAt: new Date(),
      scrapeMethod: 'schema-org',
    },
  };

  describe('basic rendering', () => {
    it('renders recipe title', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      expect(screen.getByText('Chocolate Chip Cookies')).toBeInTheDocument();
    });

    it('renders recipe author', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      expect(screen.getByText('By Test Chef')).toBeInTheDocument();
    });

    it('renders recipe description', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      expect(screen.getByText('Delicious homemade cookies')).toBeInTheDocument();
    });

    it('renders recipe image when provided', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      const img = screen.getByAltText('Chocolate Chip Cookies');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('does not render image when not provided', () => {
      const recipeWithoutImage = { ...mockRecipe, image: undefined };
      render(<RecipeCard recipe={recipeWithoutImage} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  describe('time display', () => {
    it('renders prep time in minutes', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      expect(screen.getByText('15 min')).toBeInTheDocument();
    });

    it('renders cook time in minutes', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      expect(screen.getByText('12 min')).toBeInTheDocument();
    });

    it('renders total time in minutes', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      expect(screen.getByText('27 min')).toBeInTheDocument();
    });

    it('formats time in hours when >= 60 minutes', () => {
      const longRecipe = { ...mockRecipe, totalTime: 90 };
      render(<RecipeCard recipe={longRecipe} />);
      expect(screen.getByText('1h 30m')).toBeInTheDocument();
    });

    it('formats time without minutes when even hours', () => {
      const longRecipe = { ...mockRecipe, totalTime: 120 };
      render(<RecipeCard recipe={longRecipe} />);
      expect(screen.getByText('2h')).toBeInTheDocument();
    });

    it('does not render time sections when not provided', () => {
      const recipeWithoutTimes = {
        ...mockRecipe,
        prepTime: undefined,
        cookTime: undefined,
        totalTime: undefined,
      };
      render(<RecipeCard recipe={recipeWithoutTimes} />);
      expect(screen.queryByText('Prep:')).not.toBeInTheDocument();
      expect(screen.queryByText('Cook:')).not.toBeInTheDocument();
      expect(screen.queryByText('Total:')).not.toBeInTheDocument();
    });
  });

  describe('servings display', () => {
    it('renders original servings text', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      expect(screen.getByText(/Makes 24 cookies/)).toBeInTheDocument();
    });

    it('renders scaled servings when provided', () => {
      render(
        <RecipeCard
          recipe={mockRecipe}
          scaledServings={{ amount: 48, unit: 'cookies', originalText: '' }}
          multiplier={2}
        />
      );
      expect(screen.getByText(/48 cookies/)).toBeInTheDocument();
    });

    it('shows scale badge when multiplier is not 1', () => {
      render(<RecipeCard recipe={mockRecipe} multiplier={2} />);
      expect(screen.getByText('(2x)')).toBeInTheDocument();
    });

    it('does not show scale badge when multiplier is 1', () => {
      render(<RecipeCard recipe={mockRecipe} multiplier={1} />);
      expect(screen.queryByText('(1x)')).not.toBeInTheDocument();
    });

    it('uses default unit "servings" when unit not provided', () => {
      render(
        <RecipeCard
          recipe={mockRecipe}
          scaledServings={{ amount: 8, originalText: '' }}
          multiplier={2}
        />
      );
      expect(screen.getByText(/8 servings/)).toBeInTheDocument();
    });
  });

  describe('tags display', () => {
    it('renders all tags', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      expect(screen.getByText('dessert')).toBeInTheDocument();
      expect(screen.getByText('baking')).toBeInTheDocument();
      expect(screen.getByText('cookies')).toBeInTheDocument();
    });

    it('does not render tags section when no tags', () => {
      const recipeWithoutTags = { ...mockRecipe, tags: undefined };
      render(<RecipeCard recipe={recipeWithoutTags} />);
      expect(screen.queryByText('dessert')).not.toBeInTheDocument();
    });

    it('does not render tags section when empty tags array', () => {
      const recipeWithEmptyTags = { ...mockRecipe, tags: [] };
      render(<RecipeCard recipe={recipeWithEmptyTags} />);
      // The tags container shouldn't be rendered
      const article = screen.getByRole('article');
      expect(article.querySelector('.recipe-tags')).not.toBeInTheDocument();
    });
  });

  describe('source link', () => {
    it('renders link to original recipe', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      const link = screen.getByText(/View original on example.com/);
      expect(link).toHaveAttribute('href', 'https://example.com/recipe');
    });

    it('opens link in new tab', () => {
      render(<RecipeCard recipe={mockRecipe} />);
      const link = screen.getByText(/View original on example.com/);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('optional fields', () => {
    it('does not render author when not provided', () => {
      const recipeWithoutAuthor = { ...mockRecipe, author: undefined };
      render(<RecipeCard recipe={recipeWithoutAuthor} />);
      expect(screen.queryByText(/By/)).not.toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      const recipeWithoutDesc = { ...mockRecipe, description: undefined };
      render(<RecipeCard recipe={recipeWithoutDesc} />);
      expect(screen.queryByText('Delicious homemade cookies')).not.toBeInTheDocument();
    });
  });
});
