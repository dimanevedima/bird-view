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
    try {
      window.localStorage.removeItem("bird-view-timer-runtime");
    } catch {
      // Reload should still happen if storage is unavailable.
    }
    window.location.reload();
  };

  private resetData = async () => {
    try {
      window.localStorage.removeItem("bird-view-timer-runtime");
      window.localStorage.removeItem("bird-view-timer-state");
    } catch {
      // Recovery should continue if storage is unavailable.
    }

    try {
      if ("caches" in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch {
      // Recovery should continue if Cache Storage is unavailable.
    }

    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch {
      // Recovery should continue if service workers are unavailable.
    }

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
          <button type="button" className="text-button" onClick={() => void this.resetData()}>
            Clear cache
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
