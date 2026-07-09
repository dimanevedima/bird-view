import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Bird View recovered from render error", error, info);
    try {
      window.localStorage.removeItem("bird-view-timer-runtime");
    } catch {
      // Recovery should never fail because storage is unavailable.
    }
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="crash-fallback" role="alert">
          <p>Bird View</p>
          <h1>Timer recovered</h1>
          <button type="button" onClick={this.reload}>
            Restart
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
