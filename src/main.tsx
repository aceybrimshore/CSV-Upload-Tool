import React, { ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '40px auto', background: '#fef2f2', border: '1px solid #f87171', borderRadius: '8px' }}>
          <h2 style={{ color: '#b91c1c', marginTop: 0 }}>Application Notice</h2>
          <p style={{ color: '#7f1d1d' }}>An error occurred while rendering the page:</p>
          <pre style={{ background: '#fff', padding: '12px', borderRadius: '4px', overflowX: 'auto', color: '#991b1b', fontSize: '13px' }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{ marginTop: '12px', padding: '8px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            Reset Cached Data & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

