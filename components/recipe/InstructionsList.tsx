'use client';

/**
 * Instructions list component
 */

import { Instruction } from '@/types';
import './InstructionsList.css';

interface InstructionsListProps {
  instructions: Instruction[];
}

function InstructionsList({ instructions }: InstructionsListProps) {
  return (
    <ol className="instructions-list">
      {instructions.map((instruction) => (
        <li key={instruction.step} className="instruction-item">
          <span className="step-number">{instruction.step}</span>
          <div className="instruction-content">
            <p className="instruction-text">{instruction.text}</p>

            <div className="instruction-meta">
              {instruction.temperature && (
                <span className="meta-badge meta-badge--temp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
                  </svg>
                  {instruction.temperature.value}&deg;{instruction.temperature.unit}
                </span>
              )}

              {instruction.time && (
                <span className="meta-badge meta-badge--time">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {instruction.time.value} {instruction.time.unit}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default InstructionsList;
