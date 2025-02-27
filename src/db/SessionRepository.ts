// src/db/sessionRepository.ts
import type { StoredSession, Message } from './session-store';
import { sessionStore } from './session-store';
import { prismaStore } from './prisma-store';

export const sessionRepository = {
  async getSessions(): Promise<StoredSession[]> {
    // Get sessions from local cache first
    let sessions = sessionStore.getSessions();
    // If local cache is empty, load from remote and cache locally
    if (!sessions.length) {
      sessions = await prismaStore.getSessions();
      localStorage.setItem('meld_sessions', JSON.stringify(sessions));
    }
    return sessions;
  },

  async createSession(userId: string): Promise<StoredSession> {
    // Create new session remotely
    const newSession = await prismaStore.addSession(userId);
    // Update local cache by prepending the new session
    const sessions = sessionStore.getSessions();
    sessions.unshift(newSession);
    localStorage.setItem('meld_sessions', JSON.stringify(sessions));
    return newSession;
  },

  async updateSession(sessionId: string, updates: Partial<StoredSession>): Promise<StoredSession> {
    // Update remotely first
    await prismaStore.updateSession(sessionId, updates);
    // Then update local cache
    sessionStore.updateSession(sessionId, updates);
    const sessions = sessionStore.getSessions();
    const updatedSession = sessions.find((s) => s.id === sessionId);
    if (!updatedSession) throw new Error("Session not found after update");
    return updatedSession;
  },

  async deleteSession(sessionId: string): Promise<void> {
    // Delete remotely
    await prismaStore.deleteSession(sessionId);
    // Then update local cache
    await sessionStore.deleteSession(sessionId);
  },

  getUserSessions(userId: string): StoredSession[] {
    return sessionStore.getUserSessions(userId);
  },

  async addMessage(sessionId: string, message: Message): Promise<void> {
    // Add the message locally first
    sessionStore.addMessage(sessionId, message);
    // Then push to remote API
    await prismaStore.addMessage(sessionId, message);
  },

  getMessages(sessionId: string): Message[] {
    return sessionStore.getMessages(sessionId);
  },

  getAllMessages(userId: string): Message[] {
    return sessionStore.getAllMessages(userId);
  },
};

export default sessionRepository;
