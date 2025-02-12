// src/hooks/useDatabase.ts
import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getDB, initSchema, userOps } from '@/lib/db';

interface UseDatabaseOptions {
  onError?: (error: Error) => void;
  onInitialized?: () => void;
}

export function useDatabase(options: UseDatabaseOptions = {}) {
  const { user } = useUser();
  const initialized = useRef(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initDB = async () => {
      if (initialized.current) return;
      
      try {
        const db = await getDB();
        await initSchema(db);
        initialized.current = true;
        options.onInitialized?.();

        // If user is logged in, ensure they exist in local DB
        if (user) {
          const userData = {
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress || undefined,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
          };
          await userOps.upsertUser(userData);
        }
      } catch (err) {
        console.error('Database initialization error:', err);
        const error = err instanceof Error ? err : new Error('Failed to initialize database');
        setError(error);
        options.onError?.(error);
      }
    };

    initDB();
  }, [user, options.onError, options.onInitialized]);

  return { 
    initialized: initialized.current,
    error 
  };
}
