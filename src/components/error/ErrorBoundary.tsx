import React, { ReactNode, ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center min-h-screen bg-background px-4">
            <div className="w-full max-w-md space-y-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <h1 className="text-2xl font-bold text-foreground">
                  Oops! Something went wrong
                </h1>
              </div>
              <p className="text-muted-foreground">
                We encountered an unexpected error. Please try again or contact support if the problem persists.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className="bg-muted p-3 rounded-md text-sm font-mono text-destructive overflow-auto max-h-40">
                  <summary className="cursor-pointer font-bold mb-2">Error Details</summary>
                  <pre className="whitespace-pre-wrap break-words">
                    {this.state.error?.toString()}
                  </pre>
                </details>
              )}
              <div className="flex gap-2">
                <Button onClick={this.handleReset} className="flex-1">
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = '/')}
                  className="flex-1"
                >
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
