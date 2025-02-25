import { prisma } from '../../../src/db/prisma';

export async function handleChatExport(req: Request) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get all sessions for the user
    const sessions = await prisma.session.findMany({
      where: { userId },
      include: { messages: true },
      orderBy: { timestamp: 'desc' }
    });

    // Format the sessions for export
    const exportData = sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      timestamp: session.timestamp,
      title: session.title || 'Untitled Chat',
      lastMessage: session.lastMessage || '',
      messages: session.messages.map(msg => ({
        message: {
          role: msg.role,
          content: msg.content
        },
        expressions: msg.metadata?.expressions || {},
        labels: msg.metadata?.labels || {},
        prosody: msg.metadata?.prosody || {},
        timestamp: msg.timestamp
      }))
    }));

    // Return the formatted sessions as JSON
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="chat-history-${userId}.json"`
      }
    });
  } catch (error) {
    console.error('Error in handleChatExport:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}