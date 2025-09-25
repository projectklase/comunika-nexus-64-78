import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class CalendarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Use centralized error logging
    if (process.env.NODE_ENV === 'development') {
      console.error('Calendar Error Boundary caught an error:', error, errorInfo);
    }
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro no Calendário</AlertTitle>
              <AlertDescription>
                Ocorreu um erro inesperado ao carregar o calendário. 
                {this.state.error?.message && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">Ver detalhes</summary>
                    <code className="text-xs mt-1 block">{this.state.error.message}</code>
                  </details>
                )}
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/dashboard'}
                variant="default"
                size="sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir para Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}