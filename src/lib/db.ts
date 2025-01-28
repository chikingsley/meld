import { PGlite, types } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'

let dbInstance: PGlite | null = null;

// Custom error types
export class DatabaseError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class InitializationError extends DatabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = 'InitializationError';
  }
}

// Type definitions
export interface User {
  id: string;
  config_id?: string;
  system_prompt?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  created_at?: Date;
  voice_config?: Record<string, unknown>;
}

// Singleton pattern for database instance with proper cleanup
export async function getDB() {
  if (dbInstance?.ready && !dbInstance.closed) {
    return dbInstance;
  }

  try {
    // Use PGlite.create() for better TypeScript support
    const db = await PGlite.create({
      dataDir: 'idb://meld-local',
      extensions: { vector },
      // debug: 3, // Reduced from 5 to 3 for better performance
      relaxedDurability: true,
      // Add custom parsers for JSONB
      parsers: {
        [types.JSONB]: (value: string) => JSON.parse(value),
        [types.TIMESTAMPTZ]: (value: string) => new Date(value),
      },
      // Add custom serializers
      serializers: {
        [types.JSONB]: (value: unknown) => JSON.stringify(value),
      },
    });

    // Initialize schema after db is ready
    await initSchema(db);
    dbInstance = db;
    return db;
  } catch (error) {
    console.error('Failed to initialize PGLite:', error);
    throw new InitializationError('Database initialization failed', error);
  }
}

// Cleanup function with checkpoint and better error handling
export async function closeDB() {
  if (dbInstance?.ready && !dbInstance.closed) {
    try {
      // Ensure all changes are written to disk
      await dbInstance.exec('CHECKPOINT');
      await dbInstance.close();
      dbInstance = null;
    } catch (error) {
      console.error('Error during database shutdown:', error);
      throw new DatabaseError('Failed to close database properly', error);
    }
  }
}

// Initialize schema with better error handling
export const initSchema = async (db: PGlite) => {
  try {
    return await db.exec(`
      CREATE EXTENSION IF NOT EXISTS vector;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        config_id TEXT,
        system_prompt TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT UNIQUE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        voice_config JSONB DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        title TEXT,
        metadata JSONB DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        role VARCHAR(10) NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        embedding vector(384)
      );
    `);
  } catch (error) {
    throw new DatabaseError('Failed to initialize schema', error);
  }
};

// User operations with transaction support
export const userOps = {
  async upsertUser(user: Partial<User> & Pick<User, 'id'>): Promise<void> {
    const db = await getDB();
    
    try {
      await db.transaction(async (tx) => {
        const result = await tx.query<User>(
          `INSERT INTO users (id, email, first_name, last_name)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name
           RETURNING *`,
          [user.id, user.email, user.first_name, user.last_name]
        );
        
        if (!result.rows?.[0]) {
          throw new DatabaseError('Failed to upsert user');
        }
      });
    } catch (error) {
      throw new DatabaseError('Failed to upsert user', error);
    }
  },

  async updateHumeConfig(userId: string, configId: string, voiceConfig = {}): Promise<void> {
    const db = await getDB();
    
    try {
      await db.transaction(async (tx) => {
        const result = await tx.query(
          `UPDATE users 
           SET config_id = $1, voice_config = $2
           WHERE id = $3
           RETURNING *`,
          [configId, voiceConfig, userId]
        );
        
        if (!result.rows?.[0]) {
          throw new DatabaseError('User not found');
        }
      });
    } catch (error) {
      throw new DatabaseError('Failed to update Hume config', error);
    }
  },

  async getUser(userId: string): Promise<User | null> {
    const db = await getDB();
    
    try {
      const result = await db.query<User>(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      
      return result.rows?.[0] || null;
    } catch (error) {
      throw new DatabaseError('Failed to get user', error);
    }
  }
};
