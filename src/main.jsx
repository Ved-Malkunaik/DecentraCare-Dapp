import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Web3Provider } from './web3/Web3Provider.jsx';
import { Toaster } from 'react-hot-toast';

// Global Error Boundary — prevents any unhandled render error from showing a blank screen.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('DecentraCare Error Boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a0f1e', color: '#94a3b8', fontFamily: 'sans-serif', gap: '16px'
        }}>
          <div style={{ fontSize: '48px' }}>⚕️</div>
          <h2 style={{ color: '#f1f5f9', margin: 0 }}>Something went wrong</h2>
          <p style={{ margin: 0, fontSize: '13px', maxWidth: '400px', textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred in DecentraCare.'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: '10px 28px', background: '#06b6d4', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              fontWeight: 'bold', fontSize: '14px'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Web3Provider>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#0f172a',
          color: '#fff',
          border: '1px solid #1e293b',
        }
      }} />
      <App />
    </Web3Provider>
  </ErrorBoundary>,
);
