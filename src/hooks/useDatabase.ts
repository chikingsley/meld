import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getDB, initSchema, userOps } from '@/lib/db';

export function useDatabase() {
  const { user } = useUser();
  const initialized = useRef(false);

  useEffect(() => {
    const initDB = async () => {
      if (initialized.current) return;
      
      const db = await getDB();
      await initSchema(db);
      initialized.current = true;

      // If user is logged in, ensure they exist in local DB
      if (user) {
        await userOps.upsertUser({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
        });
      }
    };

    initDB().catch(console.error);
  }, [user]);

  return { initialized: initialized.current };
}
