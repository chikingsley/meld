// src/lib/prisma-store.ts
import { prisma } from './prisma';
import type { StoredMessage, StoredSession } from './session-store';

export const prismaStore = {
  async getSessions(): Promise<StoredSession[]> {
    const sessions = await prisma.session.findMany({
      include: { messages: true }
    });
    return sessions.map(convertPrismaSession);
  },

  async addSession(userId: string): Promise<StoredSession> {
    const session = await prisma.session.create({
      data: {
        userId,
        timestamp: new Date(),
      },
      include: { messages: true }
    });
    return convertPrismaSession(session);
  },

  async updateSession(sessionId: string, updates: Partial<StoredSession>): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        // Only update fields that are present in the Prisma schema
        timestamp: updates.timestamp ? new Date(updates.timestamp) : undefined,
      }
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    await prisma.session.delete({
      where: { id: sessionId }
    });
  },

  async getUserSessions(userId: string): Promise<StoredSession[]> {
    const sessions = await prisma.session.findMany({
      where: { userId },
      include: { messages: true },
      orderBy: { timestamp: 'desc' }
    });
    return sessions.map(convertPrismaSession);
  },

  async addMessage(sessionId: string, message: StoredMessage): Promise<void> {
    await prisma.message.create({
      data: {
        sessionId,
        role: message.message.role,
        content: message.message.content,
        timestamp: new Date(message.timestamp),
        metadata: {
          expressions: message.expressions,
          labels: message.labels,
          prosody: message.prosody
        }
      }
    });
  },

  async getMessages(sessionId: string): Promise<StoredMessage[]> {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    });
    return messages.map(convertPrismaMessage);
  }
};

// Helper functions to convert between Prisma and StoredSession types
function convertPrismaSession(session: any): StoredSession {
  return {
    id: session.id,
    userId: session.userId,
    timestamp: session.timestamp.toISOString(),
    messages: session.messages?.map(convertPrismaMessage) || [],
  };
}

function convertPrismaMessage(message: any): StoredMessage {
  return {
    message: {
      role: message.role,
      content: message.content
    },
    expressions: message.metadata?.expressions,
    labels: message.metadata?.labels,
    prosody: message.metadata?.prosody,
    timestamp: message.timestamp.toISOString()
  };
}
