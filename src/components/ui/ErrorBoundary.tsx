import * as React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<unknown>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<unknown>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Unhandled UI error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-6 py-16 text-center">
          <div className="max-w-xl rounded-3xl border border-border/80 bg-card p-10 shadow-lg">
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              We hit an unexpected UI error. Please refresh the page or try
              again later.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
