// server/api/database/dbsession-handlers.ts
import { prisma } from '../../../src/db/prisma';

// Get all sessions for a user
export async function handleGetSessions(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const queryUserId = url.searchParams.get('userId');

    // If userId query param is provided, verify it matches authenticated user
    if (queryUserId && queryUserId !== userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const sessions = await prisma.session.findMany({
      where: { userId },
      include: { messages: true },
      orderBy: { timestamp: 'desc' }
    });

    return Response.json(sessions);
  } catch (error) {
    console.error('Error in handleGetSessions:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Create a new session
export async function handleCreateSession(req: Request) {
  console.log('Received create session request:', req.url);
  try {
    const userId = req.headers.get('x-user-id');
    console.log('Creating session with userId:', userId);
    
    if (!userId) {
      console.error('No userId provided in headers');
      return new Response('Unauthorized - No userId provided', { status: 401 });
    }

    const session = await prisma.session.create({
      data: {
        userId,
        timestamp: new Date()
      },
      include: { messages: true }
    });
    console.log('Created session in database:', session);

    return Response.json(session);
  } catch (error) {
    console.error('Error in handleCreateSession:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Delete a session
export async function handleDeleteSession(req: Request) {
  console.log('Received delete session request:', req.url);
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.pathname.split('/').pop();
    
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    await prisma.session.delete({
      where: { id: sessionId }
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Error in handleDeleteSession:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Get messages for a session
export async function handleGetMessages(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.pathname.split('/')[3]; // /api/sessions/:id/messages

    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });

    return Response.json(messages);
  } catch (error) {
    console.error('Error in handleGetMessages:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Add a message to a session
// Update a session
export async function handleUpdateSession(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.pathname.split('/').pop();
    
    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    const updates = await req.json();

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        timestamp: updates.timestamp ? new Date(updates.timestamp) : undefined
      },
      include: { messages: true }
    });

    return Response.json(updatedSession);
  } catch (error) {
    console.error('Error in handleUpdateSession:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function handleAddMessage(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(req.url);
    const sessionId = url.pathname.split('/')[3]; // /api/sessions/:id/messages

    if (!sessionId) {
      return new Response('Session ID required', { status: 400 });
    }

    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId }
    });

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    const body = await req.json();
    
    // Extract fields from message structure
    const { message, expressions, labels, prosody, timestamp } = body;
    const { role, content } = message;

    const newMessage = await prisma.message.create({
      data: {
        sessionId,
        role,
        content,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        metadata: {
          expressions,
          labels,
          prosody
        }
      }
    });

    console.log('Created message:', newMessage.content);

    return Response.json(newMessage);
  } catch (error) {
    console.error('Error in handleAddMessage:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}