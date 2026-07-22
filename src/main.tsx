import React, { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

interface EBState { error: Error | null; }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: 'sans-serif', background: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
          <h2 style={{ color: '#f87171' }}>Something went wrong</h2>
          <pre style={{ whiteSpace: 'pre-wrap', color: '#94a3b8' }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
