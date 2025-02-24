-- Drop existing index if it exists
DROP INDEX IF EXISTS message_vectors_embedding_idx;

-- Alter column to add dimensions
ALTER TABLE message_vectors
ALTER COLUMN embedding SET DATA TYPE vector(1024);

-- Create new vector index using ivfflat
CREATE INDEX message_vectors_embedding_idx ON message_vectors USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
