import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'

let dbInstance: PGlite | null = null;

// Singleton pattern for database instance
export async function getDB() {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new PGlite('idb://meld-local', {
    extensions: {
      vector,
    },
  });

  await db.waitReady;
  dbInstance = db;
  return db;
}

// Initialize schema
export const initSchema = async (db: PGlite) => {
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
      embedding vector(1024),
      hume_config_id TEXT
    );

    CREATE INDEX IF NOT EXISTS messages_embedding_idx ON messages 
    USING hnsw (embedding vector_ip_ops);
    
    CREATE INDEX IF NOT EXISTS sessions_user_time_idx ON sessions(user_id, created_at);
    CREATE INDEX IF NOT EXISTS messages_session_time_idx ON messages(session_id, timestamp);
  `);
}

// User operations
export const userOps = {
  async upsertUser(user: {
    id: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }) {
    const db = await getDB();
    await db.query(
      `INSERT INTO users (id, email, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name`,
      [user.id, user.email, user.firstName, user.lastName]
    );
  },

  async updateHumeConfig(userId: string, configId: string, voiceConfig = {}) {
    const db = await getDB();
    await db.query(
      `UPDATE users 
       SET config_id = $1, voice_config = $2
       WHERE id = $3`,
      [configId, JSON.stringify(voiceConfig), userId]
    );
  },

  async getUser(userId: string) {
    const db = await getDB();
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }
};
