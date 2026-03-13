import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-rose-50">
          <div className="text-5xl mb-4">&#128555;</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6">An unexpected error occurred. Please try again.</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/dashboard'; }}
            className="px-6 py-3 bg-rose-500 text-white rounded-xl font-semibold text-sm"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-6 py-3 bg-white text-rose-500 border border-rose-200 rounded-xl font-semibold text-sm"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
