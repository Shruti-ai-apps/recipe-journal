'use client';

/**
 * Install Prompt - Shows when PWA can be installed
 */

import { useInstallPrompt } from '@/hooks';
import './InstallPrompt.css';

interface InstallPromptProps {
  className?: string;
}

export default function InstallPrompt({ className = '' }: InstallPromptProps) {
  const { canInstall, isInstalled, isIOS, promptInstall, dismissPrompt, isDismissed } =
    useInstallPrompt();

  // Don't show if already installed, dismissed, or can't install
  if (isInstalled || isDismissed || !canInstall) {
    return null;
  }

  // iOS-specific instructions (no beforeinstallprompt event on iOS)
  if (isIOS) {
    return (
      <div className={`install-prompt install-prompt--ios ${className}`}>
        <div className="install-prompt__content">
          <div className="install-prompt__icon-wrapper">
            <svg
              className="install-prompt__icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <div className="install-prompt__text">
            <span className="install-prompt__title">Install Recipe Journal</span>
            <span className="install-prompt__description">
              Tap{' '}
              <svg className="install-prompt__share-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 5l-1.42 1.42-1.59-1.59V16h-2V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h3v2H6v11h12V10h-3V8h3a2 2 0 0 1 2 2z" />
              </svg>{' '}
              then &quot;Add to Home Screen&quot;
            </span>
          </div>
          <button
            className="install-prompt__dismiss"
            onClick={dismissPrompt}
            aria-label="Dismiss install prompt"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Standard install prompt (Chrome, Edge, etc.)
  return (
    <div className={`install-prompt ${className}`}>
      <div className="install-prompt__content">
        <div className="install-prompt__icon-wrapper">
          <svg
            className="install-prompt__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="install-prompt__text">
          <span className="install-prompt__title">Install Recipe Journal</span>
          <span className="install-prompt__description">
            Add to your home screen for quick access
          </span>
        </div>
        <div className="install-prompt__actions">
          <button className="install-prompt__button install-prompt__button--install" onClick={promptInstall}>
            Install
          </button>
          <button
            className="install-prompt__dismiss"
            onClick={dismissPrompt}
            aria-label="Dismiss install prompt"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
