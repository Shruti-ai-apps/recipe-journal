'use client';

/**
 * Scaling Tips Component
 *
 * Displays AI-generated or default scaling tips and cooking time adjustments
 */

import { useEffect, useState } from 'react';
import './ScalingTips.css';

interface ScalingTipsProps {
  /** List of scaling tips */
  tips: string[];
  /** Cooking time adjustment suggestion */
  cookingTimeAdjustment?: string;
  /** Whether tips are AI-generated */
  isAIPowered?: boolean;
}

function ScalingTips({
  tips,
  cookingTimeAdjustment,
  isAIPowered = false,
}: ScalingTipsProps) {
  const [isOpen, setIsOpen] = useState(() => !isAIPowered);

  useEffect(() => {
    setIsOpen(!isAIPowered);
  }, [isAIPowered, tips, cookingTimeAdjustment]);

  // Don't render if no content
  if (tips.length === 0 && !cookingTimeAdjustment) {
    return null;
  }

  return (
    <details
      className="scaling-tips"
      open={isOpen}
      onToggle={(event) =>
        setIsOpen((event.currentTarget as HTMLDetailsElement).open)
      }
    >
      <summary className="scaling-tips-summary">
        <span className="scaling-tips-title">
          <span className="scaling-tips-icon" aria-hidden="true">💡</span>
          <span>Scaling Tips</span>
        </span>
        {isAIPowered && <span className="scaling-tips-ai-badge">AI</span>}
        <span className="scaling-tips-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </summary>

      <div className="scaling-tips-body">
        {cookingTimeAdjustment && (
          <div className="scaling-tips-time">
            <span className="scaling-tips-time-icon" aria-hidden="true">⏱️</span>
            <span className="scaling-tips-time-text">{cookingTimeAdjustment}</span>
          </div>
        )}

        {tips.length > 0 && (
          <ul className="scaling-tips-list">
            {tips.map((tip, index) => (
              <li key={index} className="scaling-tips-item">
                {tip}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

export default ScalingTips;
