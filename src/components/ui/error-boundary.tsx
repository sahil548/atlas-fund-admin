"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

// ── Page-level Error Boundary ─────────────────────────────────────────────────

export class PageErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("[PageErrorBoundary] Uncaught error:", { error: error instanceof Error ? error.message : String(error), componentStack: info.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
          <div className="text-center space-y-2">
            <h2 className="text-base font-semibold text-gray-900">Something went wrong</h2>
            <p className="text-sm text-gray-500 max-w-md">
              An unexpected error occurred on this page.
              {this.state.error?.message && (
                <span className="block mt-1 font-mono text-xs text-red-500">
                  {this.state.error.message}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── Section-level Error Boundary ─────────────────────────────────────────────

export class SectionErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("[SectionErrorBoundary] Uncaught error:", { error: error instanceof Error ? error.message : String(error), componentStack: info.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-4 bg-red-50 rounded-lg border border-red-100">
          <p className="text-xs font-medium text-red-700">This section failed to load.</p>
          {this.state.error?.message && (
            <p className="text-[10px] font-mono text-red-500">{this.state.error.message}</p>
          )}
          <button
            onClick={this.handleRetry}
            className="px-3 py-1 text-xs font-medium text-red-700 border border-red-300 rounded-md hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
