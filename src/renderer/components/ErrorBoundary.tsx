/**
 * Error boundary: catches React render errors in child tree and shows fallback UI.
 * Use around the main app or views so thrown errors don't unmount the whole app.
 */
import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI when an error is caught. Receives reset callback to clear error and re-render children. */
  fallback?: (reset: () => void, error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) {
        return fallback(this.reset, error);
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-surface text-content">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-content-muted mb-4 text-center max-w-md">
            {(import.meta as { env?: { DEV?: boolean } }).env?.DEV
              ? error.message
              : 'An unexpected error occurred. Try again or reload the app.'}
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="px-4 py-2 rounded-lg bg-accent-500 text-white hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
