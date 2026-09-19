import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

/**
 * Global & Route-Level Error Boundary
 * Catches JavaScript errors anywhere in their child component tree,
 * logs those errors, and displays a clean, user-friendly fallback UI
 * instead of unmounting the tree and showing a blank screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[CampusXChange ErrorBoundary caught an unhandled error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                Oops, something went wrong
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                An unexpected interface error occurred while rendering this page. Your data is safe.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-red-600 font-mono overflow-auto max-h-40">
                <summary className="cursor-pointer font-bold select-none text-gray-700">
                  Developer Error Details
                </summary>
                <p className="mt-2 font-bold">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-1 text-[10px] text-gray-500 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>
              <a
                href="/"
                className="w-full sm:w-auto flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-4 rounded-lg transition-all text-xs flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Marketplace</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
