import React, { Component } from "react";
import { LocalizedLink } from "@/utils/localizedNav";

export interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by error boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--surface-subtle)]">
          <div className="text-center space-y-6 p-8 max-w-2xl">
            <div className="space-y-4">
              <h1 className="text-2xl font-bold text-[var(--foreground-primary)]">
                Something went wrong
              </h1>
              <div className="bg-[var(--surface-subtle)] p-4 rounded-lg">
                <p className="text-[var(--foreground-secondary)] font-mono text-sm">
                  {this.state.error?.message}
                </p>
              </div>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 primary_bg_color text-[var(--button-primary-foreground-default)] rounded-md"
              >
                Try Again
              </button>
              <LocalizedLink
                href="/"
                className="px-4 py-2 border border-[var(--border-default)] rounded-md hover:bg-[var(--surface-subtle)] transition-colors"
              >
                Go Home
              </LocalizedLink>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;