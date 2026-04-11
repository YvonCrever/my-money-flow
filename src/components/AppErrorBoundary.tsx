import {
  Component,
  useCallback,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';

import { AppStatusScreen } from '@/components/AppStatusScreen';
import { getAppErrorDescription, isIgnorableRuntimeError, normalizeAppError } from '@/lib/appRuntime';

interface RenderErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
  onError: (error: Error, info: ErrorInfo) => void;
  resetToken: number;
}

interface RenderErrorBoundaryState {
  error: Error | null;
}

class RenderErrorBoundary extends Component<RenderErrorBoundaryProps, RenderErrorBoundaryState> {
  state: RenderErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RenderErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError(error, info);
  }

  componentDidUpdate(prevProps: RenderErrorBoundaryProps) {
    if (prevProps.resetToken !== this.props.resetToken && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }

    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const handleError = (event: ErrorEvent) => {
      if (!event.error && !event.message) {
        return;
      }

      if (!event.error) {
        const message = event.message?.trim();
        if (!message || message === 'Script error.') {
          return;
        }
      }

      if (!event.error && event.filename && event.filename.startsWith('http')) {
        return;
      }

      const normalizedError = normalizeAppError(event.error ?? event.message, 'Erreur runtime non interceptee.');
      if (isIgnorableRuntimeError(normalizedError)) {
        return;
      }

      console.error('[app-runtime] window.error', normalizedError);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const normalizedError = normalizeAppError(event.reason, 'Promise rejetee sans gestionnaire.');
      if (isIgnorableRuntimeError(normalizedError)) {
        return;
      }

      console.error('[app-runtime] window.unhandledrejection', normalizedError);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const handleRetry = useCallback(() => {
    setResetToken((current) => current + 1);
  }, []);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <RenderErrorBoundary
      resetToken={resetToken}
      onError={(error, info) => {
        console.error('[app-runtime] react render error', error, info);
      }}
      fallback={(error) => (
        <AppStatusScreen
          mode="error"
          title="Ycaro n'a pas pu afficher cet ecran"
          description={getAppErrorDescription(error)}
          details={import.meta.env.DEV ? error.stack ?? error.message : null}
          primaryAction={{ label: 'Reessayer', onClick: handleRetry }}
          secondaryAction={{ label: 'Recharger', onClick: handleReload }}
        />
      )}
    >
      {children}
    </RenderErrorBoundary>
  );
}
