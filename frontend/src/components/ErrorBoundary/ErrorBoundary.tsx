import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TaskFlow ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrapper">
          <div className="error-boundary-card">
            <div className="error-boundary-header">
              <div className="error-boundary-icon">
                <AlertOctagon className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <h2 className="error-boundary-title">
                  {this.props.fallbackTitle || '¡Ups! Algo no salió como esperábamos'}
                </h2>
                <p className="error-boundary-subtitle">
                  Ocurrió un error inesperado en la interfaz. Puedes intentar reintentar esta sección o refrescar la aplicación.
                </p>
              </div>
            </div>

            <div className="error-boundary-actions">
              <button
                type="button"
                onClick={this.handleReset}
                className="error-boundary-btn error-boundary-btn--primary"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                <span>Reintentar</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="error-boundary-btn error-boundary-btn--secondary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span>Recargar aplicación</span>
              </button>
            </div>

            {this.state.error && (
              <div className="error-boundary-details-section">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="error-boundary-details-toggle"
                >
                  <span>{this.state.showDetails ? 'Ocultar detalles técnicos' : 'Ver detalles del error'}</span>
                  {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {this.state.showDetails && (
                  <pre className="error-boundary-details-box">
                    <code>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </code>
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
