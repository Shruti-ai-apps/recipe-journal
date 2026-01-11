import { render, screen, fireEvent } from '@testing-library/react';
import IngredientList from './IngredientList';
import { ScaledIngredient } from '@/types';

describe('IngredientList', () => {
  const createMockIngredient = (overrides: Partial<ScaledIngredient> = {}): ScaledIngredient => ({
    id: 'ing-1',
    original: '2 cups flour',
    quantity: { type: 'single', value: 2, displayValue: '2' },
    unit: 'cup',
    ingredient: 'flour',
    parseConfidence: 0.9,
    scaledQuantity: { value: 4, displayValue: '4', wasRounded: false, originalValue: 2 },
    scaledUnit: 'cup',
    displayText: '4 cups flour',
    ...overrides,
  });

  describe('rendering', () => {
    it('renders a list of ingredients', () => {
      const ingredients = [
        createMockIngredient({ id: 'ing-1', displayText: '4 cups flour' }),
        createMockIngredient({ id: 'ing-2', displayText: '1 tsp salt' }),
        createMockIngredient({ id: 'ing-3', displayText: '2 eggs' }),
      ];

      render(<IngredientList ingredients={ingredients} />);

      expect(screen.getByText('4 cups flour')).toBeInTheDocument();
      expect(screen.getByText('1 tsp salt')).toBeInTheDocument();
      expect(screen.getByText('2 eggs')).toBeInTheDocument();
    });

    it('renders as unordered list', () => {
      const ingredients = [createMockIngredient()];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      expect(container.querySelector('ul.ingredient-list')).toBeInTheDocument();
    });

    it('renders empty list when no ingredients', () => {
      const { container } = render(<IngredientList ingredients={[]} />);

      const list = container.querySelector('ul.ingredient-list');
      expect(list).toBeInTheDocument();
      expect(list?.children).toHaveLength(0);
    });
  });

  describe('parse confidence warning', () => {
    it('shows warning icon for low confidence ingredients', () => {
      const ingredients = [
        createMockIngredient({ parseConfidence: 0.5 }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      const warning = container.querySelector('.ingredient-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveAttribute('title', 'This ingredient may not have been parsed correctly');
    });

    it('does not show warning for high confidence ingredients', () => {
      const ingredients = [
        createMockIngredient({ parseConfidence: 0.9 }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      expect(container.querySelector('.ingredient-warning')).not.toBeInTheDocument();
    });

    it('shows warning when confidence is exactly 0.8', () => {
      const ingredients = [
        createMockIngredient({ parseConfidence: 0.8 }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      // 0.8 is not < 0.8, so no warning
      expect(container.querySelector('.ingredient-warning')).not.toBeInTheDocument();
    });

    it('shows warning when confidence is 0.79', () => {
      const ingredients = [
        createMockIngredient({ parseConfidence: 0.79 }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      expect(container.querySelector('.ingredient-warning')).toBeInTheDocument();
    });
  });

  describe('original text toggle', () => {
    it('shows toggle button when original differs from displayText', () => {
      const ingredients = [
        createMockIngredient({
          original: '2 c flour',
          displayText: '4 cups flour',
        }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      const toggle = container.querySelector('.original-toggle');
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute('title', 'Show original');
    });

    it('does not show toggle when original matches displayText', () => {
      const ingredients = [
        createMockIngredient({
          original: '4 cups flour',
          displayText: '4 cups flour',
        }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      expect(container.querySelector('.original-toggle')).not.toBeInTheDocument();
    });

    it('contains original text in tooltip', () => {
      const ingredients = [
        createMockIngredient({
          original: '2 c flour',
          displayText: '4 cups flour',
        }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      const tooltip = container.querySelector('.original-tooltip');
      expect(tooltip).toHaveTextContent('Original: 2 c flour');
    });

    it('toggles tooltip visibility on click', () => {
      const ingredients = [
        createMockIngredient({
          original: '2 c flour',
          displayText: '4 cups flour',
        }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      const toggle = container.querySelector('.original-toggle') as HTMLButtonElement;
      const tooltip = container.querySelector('.original-tooltip');

      expect(tooltip).not.toHaveClass('visible');

      fireEvent.click(toggle);
      expect(tooltip).toHaveClass('visible');

      fireEvent.click(toggle);
      expect(tooltip).not.toHaveClass('visible');
    });
  });

  describe('unique keys', () => {
    it('uses ingredient id as key', () => {
      const ingredients = [
        createMockIngredient({ id: 'unique-id-1' }),
        createMockIngredient({ id: 'unique-id-2' }),
      ];

      const { container } = render(<IngredientList ingredients={ingredients} />);

      const items = container.querySelectorAll('.ingredient-item');
      expect(items).toHaveLength(2);
    });
  });
});
