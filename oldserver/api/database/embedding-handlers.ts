// server/api/database/embedding-handlers.ts
import { prisma } from '../../../src/db/prisma';
import { generateEmbeddings } from '../../../src/utils/RAG/jina-embeddings';

// Generate embeddings (single or batch)
export async function handleGenerateEmbeddings(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { texts } = await req.json();
    
    if (!Array.isArray(texts)) {
      return new Response('Invalid input: texts must be an array', { status: 400 });
    }

    const embeddings = await generateEmbeddings(texts);
    return Response.json({ embeddings });
  } catch (error) {
    console.error('Error in handleGenerateEmbeddings:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Store embedding for a message
export async function handleStoreEmbedding(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { messageId, content } = await req.json();
    
    if (!messageId || !content) {
      return new Response('Missing required fields: messageId, content', { status: 400 });
    }

    // Verify message belongs to user's session
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        session: { userId }
      }
    });

    if (!message) {
      return new Response('Message not found', { status: 404 });
    }

    const [embedding] = await generateEmbeddings([content]);
    const vectorData = JSON.stringify(embedding);
    
    const messageVector = await prisma.messageVector.create({
      data: {
        messageId: messageId,
      }
    });

    // Use raw SQL to insert vector data
    await prisma.$executeRaw`
      INSERT INTO message_vectors (message_id, embedding)
      VALUES (${messageId}::uuid, ${vectorData}::vector)
      ON CONFLICT (message_id)
      DO UPDATE SET embedding = ${vectorData}::vector
    `;

    // Fetch the inserted/updated vector
    const [vector] = await prisma.$queryRaw<{ message_id: string; embedding: string }[]>`
      SELECT message_id, embedding::text as embedding
      FROM message_vectors
      WHERE message_id = ${messageId}::uuid
    `;

    if (!vector) {
      throw new Error('Vector not found after insertion');
    }

    return Response.json({
      message_id: vector.message_id,
      embedding: vector.embedding
    });
  } catch (error) {
    console.error('Error in handleStoreEmbedding:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}