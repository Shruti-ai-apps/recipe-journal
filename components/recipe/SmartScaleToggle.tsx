'use client';

/**
 * Smart Scale Toggle Component
 *
 * Toggle switch to enable/disable AI-powered recipe scaling
 */

import './SmartScaleToggle.css';

interface SmartScaleToggleProps {
  /** Whether smart scaling is enabled */
  enabled: boolean;
  /** Callback when toggle is clicked */
  onToggle: (enabled: boolean) => void;
  /** Disable the toggle */
  disabled?: boolean;
  /** Show loading state */
  loading?: boolean;
}

function SmartScaleToggle({
  enabled,
  onToggle,
  disabled = false,
  loading = false,
}: SmartScaleToggleProps) {
  const handleClick = () => {
    if (!disabled && !loading) {
      onToggle(!enabled);
    }
  };

  return (
    <div className="smart-scale-toggle">
      <label className="smart-scale-label">
        <span className="smart-scale-label-text">
          Smart Scale
          <span className="smart-scale-ai-badge">AI</span>
        </span>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle smart scaling"
          disabled={disabled || loading}
          onClick={handleClick}
          className={`smart-scale-switch ${enabled ? 'smart-scale-switch--enabled' : ''} ${loading ? 'smart-scale-switch--loading' : ''}`}
        >
          <span className="smart-scale-slider">
            {loading && <span className="smart-scale-spinner" />}
          </span>
        </button>
      </label>

      {enabled && !loading && (
        <p className="smart-scale-hint">
          AI adds guidance for eggs, spices, and leavening
        </p>
      )}

      {loading && (
        <p className="smart-scale-hint smart-scale-hint--loading">
          AI is scaling your recipe...
        </p>
      )}
    </div>
  );
}

export default SmartScaleToggle;
