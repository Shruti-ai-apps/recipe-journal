'use client';

/**
 * AI Badge Component
 *
 * Small badge indicator showing that content was AI-adjusted
 */

import './AIBadge.css';

interface AIBadgeProps {
  /** Tooltip text explaining the adjustment */
  reason?: string;
  /** Badge size */
  size?: 'small' | 'medium';
}

function AIBadge({ reason, size = 'small' }: AIBadgeProps) {
  return (
    <span
      className={`ai-badge ai-badge--${size}`}
      title={reason || 'AI-adjusted'}
      aria-label={reason || 'AI-adjusted'}
    >
      AI
    </span>
  );
}

export default AIBadge;
