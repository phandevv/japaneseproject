import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error caught by ErrorBoundary:', error, errorInfo);
    // TODO Phase 5: send to Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '24px',
          padding: '40px',
          textAlign: 'center',
          background: 'var(--bg-color)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-ui)'
        }}>
          <div style={{ fontSize: '4rem' }}>⚠️</div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)' }}>
            Có lỗi xảy ra
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6 }}>
            Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang.
            Nếu lỗi vẫn tiếp tục, hãy liên hệ hỗ trợ.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid var(--accent-color)',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '0.8rem',
              color: 'var(--accent-color)',
              textAlign: 'left',
              maxWidth: '600px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap'
            }}>
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 32px',
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)'
            }}
          >
            Tải lại trang
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
