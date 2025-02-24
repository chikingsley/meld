// src/db/prisma-store.ts
import type { StoredMessage, StoredSession } from './session-store';

const API_BASE = '';

// Helper function to get common headers
const getHeaders = (): HeadersInit => {
  const userId = localStorage.getItem('userId'); // Or get from auth context
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId || ''
  };
};

export const prismaStore = {
  async getSessions(): Promise<StoredSession[]> {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch sessions');
    return response.json();
  },

  async addSession(userId: string): Promise<StoredSession> {
    const response = await fetch(`${API_BASE}/api/sessions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId })
    });
    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  },

  async updateSession(sessionId: string, updates: Partial<StoredSession>): Promise<void> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update session');
  },

  async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to delete session');
  },

  async getUserSessions(userId: string): Promise<StoredSession[]> {
    const response = await fetch(`${API_BASE}/api/sessions?userId=${userId}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch user sessions');
    return response.json();
  },

  async addMessage(sessionId: string, message: StoredMessage): Promise<void> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(message)
    });
    if (!response.ok) throw new Error('Failed to add message');
  },

  async getMessages(sessionId: string): Promise<StoredMessage[]> {
    const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  },
};

