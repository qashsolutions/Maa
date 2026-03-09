import React, { createContext, useContext, useEffect, useState } from 'react';
import { openEncryptedDatabase, type EncryptedDatabase } from '../lib/db/encrypted-database';
import { initializeDatabase, createIndexes } from '../lib/db/schema';

interface DatabaseContextType {
  db: EncryptedDatabase | null;
  isReady: boolean;
}

const DatabaseContext = createContext<DatabaseContextType>({
  db: null,
  isReady: false,
});

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<EncryptedDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        const database = await openEncryptedDatabase();
        await initializeDatabase(database);
        await createIndexes(database);
        if (mounted) {
          setDb(database);
          setIsReady(true);
        }
      } catch (error) {
        console.error('Database initialization failed:', error);
      }
    }

    setup();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  return useContext(DatabaseContext);
}
