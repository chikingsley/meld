// src/workers/worker.ts
import type { StoredMessage, StoredSession } from '@/db/session-store.ts';
import { useUserStore } from '@/stores/useUserStore';

const API_BASE = 'http://localhost:3001';

// Create a worker for handling background operations
let worker: Worker | null = null;
let workerReady = false;
const pendingTasks: Map<string, { resolve: Function, reject: Function, timeout: ReturnType<typeof setTimeout> }> = new Map();

// Initialize the worker
function initWorker() {
  if (worker) return;
  
  try {
    // Create the worker using Vite's worker import
    const workerUrl = new URL('../workers/worker.ts', import.meta.url).href;
    worker = new Worker(workerUrl);
    
    // Set up message handler
    worker.onmessage = handleWorkerMessage;
    
    // Set up error handler
    worker.onerror = (error) => {
      console.error('Worker error:', error);
      // Reject all pending tasks
      pendingTasks.forEach(({ reject }) => {
        reject(new Error('Worker encountered an error'));
      });
      pendingTasks.clear();
      
      // Try to recreate the worker
      worker = null;
      setTimeout(initWorker, 1000);
    };
    
    workerReady = true;
    console.log('👷 Background worker initialized');
    
    // Update worker auth state
    updateWorkerAuth();
  } catch (error) {
    console.error('Failed to initialize worker:', error);
    worker = null;
  }
}

// Update worker with current auth
function updateWorkerAuth() {
  if (!worker || !workerReady) return;
  
  try {
    const { userId, token } = useUserStore.getState();
    if (userId && token) {
      worker.postMessage({
        type: 'AUTH_UPDATE',
        auth: { userId, token }
      });
    }
  } catch (error) {
    console.error('Failed to update worker auth:', error);
  }
}

// Handle worker messages
function handleWorkerMessage(event: MessageEvent) {
  const { type, error, taskId, ...data } = event.data;
  
  // Find the pending task
  if (taskId && pendingTasks.has(taskId)) {
    const { resolve, reject, timeout } = pendingTasks.get(taskId)!;
    clearTimeout(timeout);
    
    if (type.endsWith('_ERROR')) {
      reject(new Error(error || 'Unknown worker error'));
    } else if (type.endsWith('_COMPLETE')) {
      resolve(data);
    }
    
    pendingTasks.delete(taskId);
  }
}

// Helper to send a task to the worker
function sendToWorker<T>(type: string, payload: any = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    // Make sure worker is initialized
    if (!worker || !workerReady) {
      try {
        initWorker();
      } catch (error) {
        return reject(new Error('Failed to initialize worker'));
      }
    }
    
    // Generate a unique task ID
    const taskId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add taskId to payload
    payload.taskId = taskId;
    
    // Set up timeout
    const timeout = setTimeout(() => {
      if (pendingTasks.has(taskId)) {
        pendingTasks.get(taskId)?.reject(new Error(`Task ${type} timed out after 30 seconds`));
        pendingTasks.delete(taskId);
      }
    }, 30000);
    
    // Store the promise handlers
    pendingTasks.set(taskId, { resolve, reject, timeout });
    
    // Send the message to the worker
    worker!.postMessage({ type, payload });
  });
}

// Helper function to get common headers for direct operations
const getHeaders = async (): Promise<HeadersInit> => {
  // Wait for both userId and token to be available
  return new Promise((resolve, reject) => {
    const checkAuth = () => {
      const { userId, token } = useUserStore.getState();
      if (userId && token) {
        // Also update the worker auth
        updateWorkerAuth();
        
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
    console.log('🔧 Adding message using worker thread:', { sessionId });
    
    try {
      // We'll use the worker for this heavy task
      initWorker();
      
      // Create a task in the worker
      const result = await sendToWorker<{messageId: string, sessionId: string}>('ADD_MESSAGE', {
        sessionId,
        message
      });
      
      // Return a mock Response object with the message ID for compatibility
      return new Response(JSON.stringify({ id: result.messageId }), {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('[prismaStore] Worker failed to add message, falling back:', error);
      
      // Fall back to direct API call if worker fails
      const url = `${API_BASE}/api/sessions/${sessionId}/messages`;
      const headers = await getHeaders();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(message)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[prismaStore] Direct message add failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Failed to add message: ${response.status} ${errorText}`);
      }
      
      return response;
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
    console.log('🔧 Storing embedding using worker thread:', { messageId });
    
    try {
      // We'll use the worker for this heavy task
      initWorker();
      
      // The worker will handle this automatically as part of ADD_MESSAGE
      // but we also support direct calls for compatibility
      await sendToWorker('STORE_EMBEDDING', {
        messageId,
        content
      });
      
      console.log('Stored embedding via worker');
    } catch (error) {
      console.error('[prismaStore] Worker failed to store embedding, falling back:', error);
      
      // Fall back to direct API call if worker fails
      const headers = await getHeaders();
      const response = await fetch(`${API_BASE}/api/embeddings/store`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messageId, content })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to store embedding: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      console.log('Stored embedding via direct API');
      
      const result = await response.json();
      if (!result) {
        throw new Error('No response data from embedding storage');
      }
    }
  }
};

// Initialize the worker at module load time
try {
  initWorker();
} catch (error) {
  console.error('Failed to initialize worker during module load:', error);
}