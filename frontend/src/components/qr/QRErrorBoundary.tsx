import React from 'react';

interface QRErrorBoundaryProps {
  children: React.ReactNode;
}

interface QRErrorBoundaryState {
  hasError: boolean;
}

export class QRErrorBoundary extends React.Component<QRErrorBoundaryProps, QRErrorBoundaryState> {
  constructor(props: QRErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: any): QRErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[QR] ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <div className="text-white text-center">
            <p className="text-red-400 mb-4">שגיאה בטעינת סורק ה-QR</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg"
            >
              טען מחדש
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
