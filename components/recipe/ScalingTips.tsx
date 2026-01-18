'use client';

/**
 * Scaling Tips Component
 *
 * Displays AI-generated or default scaling tips and cooking time adjustments
 */

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
  // Don't render if no content
  if (tips.length === 0 && !cookingTimeAdjustment) {
    return null;
  }

  return (
    <div className="scaling-tips">
      <h4 className="scaling-tips-title">
        <span className="scaling-tips-icon">💡</span>
        Scaling Tips
        {isAIPowered && <span className="scaling-tips-ai-badge">AI</span>}
      </h4>

      {cookingTimeAdjustment && (
        <div className="scaling-tips-time">
          <span className="scaling-tips-time-icon">⏱️</span>
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
  );
}

export default ScalingTips;
