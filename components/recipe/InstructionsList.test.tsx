import { render, screen } from '@testing-library/react';
import InstructionsList from './InstructionsList';
import { Instruction } from '@/types';

describe('InstructionsList', () => {
  const mockInstructions: Instruction[] = [
    { step: 1, text: 'Preheat oven to 350°F' },
    { step: 2, text: 'Mix dry ingredients' },
    { step: 3, text: 'Bake for 25 minutes' },
  ];

  describe('rendering', () => {
    it('renders all instructions', () => {
      render(<InstructionsList instructions={mockInstructions} />);

      expect(screen.getByText('Preheat oven to 350°F')).toBeInTheDocument();
      expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument();
      expect(screen.getByText('Bake for 25 minutes')).toBeInTheDocument();
    });

    it('renders as ordered list', () => {
      const { container } = render(<InstructionsList instructions={mockInstructions} />);

      expect(container.querySelector('ol.instructions-list')).toBeInTheDocument();
    });

    it('displays step numbers', () => {
      render(<InstructionsList instructions={mockInstructions} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders empty list when no instructions', () => {
      const { container } = render(<InstructionsList instructions={[]} />);

      const list = container.querySelector('ol.instructions-list');
      expect(list).toBeInTheDocument();
      expect(list?.children).toHaveLength(0);
    });
  });

  describe('temperature display', () => {
    it('displays temperature when provided', () => {
      const instructions: Instruction[] = [
        {
          step: 1,
          text: 'Preheat the oven',
          temperature: { value: 350, unit: 'F', originalText: '350°F' },
        },
      ];

      render(<InstructionsList instructions={instructions} />);

      expect(screen.getByText(/350/)).toBeInTheDocument();
      expect(screen.getByText(/°F/)).toBeInTheDocument();
    });

    it('displays Celsius temperature', () => {
      const instructions: Instruction[] = [
        {
          step: 1,
          text: 'Preheat the oven',
          temperature: { value: 180, unit: 'C', originalText: '180°C' },
        },
      ];

      render(<InstructionsList instructions={instructions} />);

      expect(screen.getByText(/180/)).toBeInTheDocument();
      expect(screen.getByText(/°C/)).toBeInTheDocument();
    });

    it('does not show temperature badge when not provided', () => {
      const instructions: Instruction[] = [
        { step: 1, text: 'Mix ingredients' },
      ];

      const { container } = render(<InstructionsList instructions={instructions} />);

      expect(container.querySelector('.meta-badge--temp')).not.toBeInTheDocument();
    });
  });

  describe('time display', () => {
    it('displays time in minutes when provided', () => {
      const instructions: Instruction[] = [
        {
          step: 1,
          text: 'Bake the cake',
          time: { value: 25, unit: 'minutes', originalText: '25 minutes' },
        },
      ];

      render(<InstructionsList instructions={instructions} />);

      expect(screen.getByText(/25 minutes/)).toBeInTheDocument();
    });

    it('displays time in hours when provided', () => {
      const instructions: Instruction[] = [
        {
          step: 1,
          text: 'Let rise',
          time: { value: 2, unit: 'hours', originalText: '2 hours' },
        },
      ];

      render(<InstructionsList instructions={instructions} />);

      expect(screen.getByText(/2 hours/)).toBeInTheDocument();
    });

    it('does not show time badge when not provided', () => {
      const instructions: Instruction[] = [
        { step: 1, text: 'Mix ingredients' },
      ];

      const { container } = render(<InstructionsList instructions={instructions} />);

      expect(container.querySelector('.meta-badge--time')).not.toBeInTheDocument();
    });
  });

  describe('combined metadata', () => {
    it('displays both temperature and time when provided', () => {
      const instructions: Instruction[] = [
        {
          step: 1,
          text: 'Bake until golden',
          temperature: { value: 375, unit: 'F', originalText: '375°F' },
          time: { value: 30, unit: 'minutes', originalText: '30 minutes' },
        },
      ];

      const { container } = render(<InstructionsList instructions={instructions} />);

      expect(container.querySelector('.meta-badge--temp')).toBeInTheDocument();
      expect(container.querySelector('.meta-badge--time')).toBeInTheDocument();
      expect(screen.getByText(/375/)).toBeInTheDocument();
      expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
    });
  });
});
