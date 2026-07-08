import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** Catches render errors in the subtree (React Query errors are handled separately via error states). */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="container flex flex-col items-center gap-4 py-24 text-center">
          <AlertTriangle className="size-10 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold">Something went wrong</p>
            <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
          </div>
          <Button onClick={this.handleReset}>Try again</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
