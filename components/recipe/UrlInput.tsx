'use client';

/**
 * URL input component for entering recipe URLs
 */

import { useState, FormEvent } from 'react';
import './UrlInput.css';

interface UrlInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

function UrlInput({ onSubmit, disabled = false }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateUrl = (value: string): boolean => {
    if (!value.trim()) {
      setValidationError('Please enter a URL');
      return false;
    }

    try {
      const parsed = new URL(value);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setValidationError('Please enter a valid HTTP or HTTPS URL');
        return false;
      }
    } catch {
      setValidationError('Please enter a valid URL');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (validateUrl(url)) {
      onSubmit(url);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        setValidationError(null);
      }
    } catch (err) {
      // Clipboard access denied or not available
    }
  };

  return (
    <form className="url-input-form" onSubmit={handleSubmit}>
      <div className="url-input-wrapper">
        <input
          type="url"
          className={`url-input ${validationError ? 'url-input--error' : ''}`}
          placeholder="https://www.allrecipes.com/recipe/..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (validationError) setValidationError(null);
          }}
          disabled={disabled}
          aria-label="Recipe URL"
          aria-invalid={!!validationError}
          aria-describedby={validationError ? 'url-error' : undefined}
        />
        <button
          type="button"
          className="paste-button"
          onClick={handlePaste}
          disabled={disabled}
          title="Paste from clipboard"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>

      {validationError && (
        <p id="url-error" className="url-error">
          {validationError}
        </p>
      )}

      <button type="submit" className="submit-button" disabled={disabled || !url.trim()}>
        {disabled ? 'Loading...' : 'Get Recipe'}
      </button>

      <p className="url-hint">
        Paste a link from your favorite recipe site. Works with most popular cooking sites.
      </p>
    </form>
  );
}

export default UrlInput;
