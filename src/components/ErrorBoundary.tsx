'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  eventId: string | null
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Generate unique error ID for tracking
    const eventId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.setState({
      error,
      errorInfo,
      eventId
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Log to external service (e.g., Sentry, LogRocket)
    if (typeof window !== 'undefined') {
      // Example: Send to analytics/monitoring service
      console.error('Error ID:', eventId, {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => key !== prevProps.resetKeys?.[idx])) {
        this.resetErrorBoundary()
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        eventId: null
      })
    }, 100)
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  render() {
    const { hasError, error, errorInfo, eventId } = this.state
    const { children, fallback } = this.props

    if (hasError) {
      // Custom fallback component
      if (fallback) {
        return fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-500">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Oops! Qualcosa è andato storto
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Si è verificato un errore imprevisto. I nostri sviluppatori sono stati notificati.
              </p>
              {eventId && (
                <p className="mt-1 text-xs text-gray-500">
                  ID Errore: {eventId}
                </p>
              )}
            </div>

            <div className="space-y-4">
              <button
                onClick={this.resetErrorBoundary}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Riprova
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Ricarica Pagina
              </button>
            </div>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Dettagli Errore (Solo Sviluppo)
                </summary>
                <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded-md">
                  <pre className="text-xs text-red-800 whitespace-pre-wrap overflow-x-auto">
                    {error.stack}
                  </pre>
                  {errorInfo && (
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-red-800">Component Stack:</h4>
                      <pre className="text-xs text-red-700 whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return children
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for manual error reporting
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Manual error report:', error, errorInfo)
    // Could integrate with external error reporting service
  }
}

export default ErrorBoundary