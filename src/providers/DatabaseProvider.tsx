import { PropsWithChildren, useEffect, useState, useCallback } from 'react';
import { useDatabase } from '@/hooks/useDatabase';
import { DatabaseError, InitializationError } from '@/lib/db';
import { closeDB } from '@/lib/db';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // Start with 1 second

interface DatabaseState {
  error: Error | null;
  isInitializing: boolean;
  retryCount: number;
}

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<DatabaseState>({
    error: null,
    isInitializing: true,
    retryCount: 0,
  });
  
  const { initialized, error: dbError } = useDatabase({
    onError: (error) => {
      console.error('Database initialization error:', error);
      
      // Handle different types of errors
      if (error instanceof InitializationError) {
        // For initialization errors, we can retry
        if (state.retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY * Math.pow(2, state.retryCount);
          setTimeout(() => {
            setState(prev => ({
              ...prev,
              retryCount: prev.retryCount + 1,
              isInitializing: true,
              error: null
            }));
          }, delay);
        } else {
          setState(prev => ({
            ...prev,
            error,
            isInitializing: false
          }));
        }
      } else {
        // For other errors, just set the error state
        setState(prev => ({
          ...prev,
          error,
          isInitializing: false
        }));
      }
    },
    onInitialized: () => {
      setState(prev => ({
        ...prev,
        isInitializing: false,
        error: null,
        retryCount: 0
      }));
    }
  });

  // Add cleanup handler
  const cleanup = useCallback(async () => {
    try {
      await closeDB();
    } catch (error) {
      console.error('Failed to close database:', error);
    }
  }, []);

  // Handle cleanup on unmount and window unload
  useEffect(() => {
    // Handle window unload
    const handleUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      cleanup();
      // Chrome requires returnValue to be set
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleUnload);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      cleanup();
    };
  }, [cleanup]);

  // Handle database error
  useEffect(() => {
    if (dbError) {
      console.error('Database error:', dbError);
      setState(prev => ({
        ...prev,
        error: dbError
      }));
    }
  }, [dbError]);

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Database Error</h2>
          <p className="text-red-500">{state.error.message}</p>
          {state.retryCount < MAX_RETRIES && (
            <p className="text-sm text-gray-600 mt-2">
              Retrying... Attempt {state.retryCount + 1} of {MAX_RETRIES}
            </p>
          )}
          <button 
            onClick={() => {
              setState({
                error: null,
                isInitializing: true,
                retryCount: 0
              });
            }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (state.isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Initializing Database</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          {state.retryCount > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              Retry attempt {state.retryCount} of {MAX_RETRIES}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
