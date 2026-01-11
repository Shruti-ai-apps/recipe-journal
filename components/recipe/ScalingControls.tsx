'use client';

/**
 * Scaling controls component
 */

import { useState } from 'react';
import './ScalingControls.css';

interface ScalingControlsProps {
  currentMultiplier: number;
  onScale: (multiplier: number) => void;
  disabled?: boolean;
}

const PRESET_MULTIPLIERS = [0.5, 1, 2, 3];

function ScalingControls({ currentMultiplier, onScale, disabled = false }: ScalingControlsProps) {
  const [customValue, setCustomValue] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = (multiplier: number) => {
    setShowCustom(false);
    setCustomValue('');
    onScale(multiplier);
  };

  const handleCustomSubmit = () => {
    const value = parseFloat(customValue);
    if (!isNaN(value) && value > 0 && value <= 10) {
      onScale(value);
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    }
  };

  return (
    <div className="scaling-controls">
      <span className="scaling-label">Scale recipe:</span>

      <div className="scaling-buttons">
        {PRESET_MULTIPLIERS.map((multiplier) => (
          <button
            key={multiplier}
            className={`scale-button ${currentMultiplier === multiplier ? 'scale-button--active' : ''}`}
            onClick={() => handlePresetClick(multiplier)}
            disabled={disabled}
          >
            {multiplier}x
          </button>
        ))}

        <button
          className={`scale-button ${showCustom ? 'scale-button--active' : ''}`}
          onClick={() => setShowCustom(!showCustom)}
          disabled={disabled}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="custom-input-wrapper">
          <input
            type="number"
            className="custom-input"
            placeholder="Enter multiplier"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            min="0.1"
            max="10"
            step="0.1"
            disabled={disabled}
          />
          <button
            className="custom-apply-button"
            onClick={handleCustomSubmit}
            disabled={disabled || !customValue}
          >
            Apply
          </button>
        </div>
      )}

      <div className="current-scale">
        Current: <strong>{currentMultiplier}x</strong>
      </div>
    </div>
  );
}

export default ScalingControls;
