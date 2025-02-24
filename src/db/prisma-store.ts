// src/db/prisma-store.ts
import type { StoredMessage, StoredSession } from './session-store';
import { useUserStore } from '@/stores/useUserStore';

const API_BASE = 'http://localhost:3001';

// Helper function to get common headers
const getHeaders = async (): Promise<HeadersInit> => {
  // Wait for both userId and token to be available
  return new Promise((resolve, reject) => {
    const checkAuth = () => {
      const { userId, token } = useUserStore.getState();
      if (userId && token) {
        resolve({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId
        });
      } else {
        // Keep checking every 100ms
        setTimeout(checkAuth, 100);
      }
    };
    checkAuth();
    
    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error('Timeout waiting for auth credentials'));
    }, 5000);
  });
};

export const prismaStore = {
  async getSessions(): Promise<StoredSession[]> {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE}/api/sessions`, { headers });
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json();
    } catch (error) {
      console.error('[prismaStore] Failed to get sessions:', error);
      throw error;
    }
  },

  async addSession(userId: string): Promise<StoredSession> {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE}/api/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId })
      });
      if (!response.ok) throw new Error('Failed to create session');
      return response.json();
    } catch (error) {
      console.error('[prismaStore] Failed to add session:', error);
      throw error;
    }
  },

  async updateSession(sessionId: string, updates: Partial<StoredSession>): Promise<void> {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update session');
    } catch (error) {
      console.error('[prismaStore] Failed to update session:', error);
      throw error;
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers
      });
      if (!response.ok) throw new Error('Failed to delete session');
    } catch (error) {
      console.error('[prismaStore] Failed to delete session:', error);
      throw error;
    }
  },

  async getUserSessions(userId: string): Promise<StoredSession[]> {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE}/api/sessions?userId=${userId}`, { headers });
      if (!response.ok) throw new Error('Failed to fetch user sessions');
      return response.json();
    } catch (error) {
      console.error('[prismaStore] Failed to get user sessions:', error);
      throw error;
    }
  },

  async addMessage(sessionId: string, message: StoredMessage): Promise<Response> {
    try {
      const url = `${API_BASE}/api/sessions/${sessionId}/messages`;
      const headers = await getHeaders();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(message)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[prismaStore] Failed to add message:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to add message: ${response.status} ${errorText}`);
      }
      return response;
    } catch (error) {
      console.error('[prismaStore] Failed to add message:', error);
      throw error;
    }
  },

  async getMessages(sessionId: string): Promise<StoredMessage[]> {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE}/api/sessions/${sessionId}/messages`, { headers });
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    } catch (error) {
      console.error('[prismaStore] Failed to get messages:', error);
      throw error;
    }
  },

  async storeEmbedding(messageId: string, content: string): Promise<void> {
    try {
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE}/api/embeddings/store`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messageId, content })
      });
      console.log('Stored embedding');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to store embedding: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      if (!result) {
        throw new Error('No response data from embedding storage');
      }
    } catch (error) {
      console.error('[prismaStore] Failed to store embedding:', error);
      throw error; // Rethrow so we can debug the issue
    }
  }
};
