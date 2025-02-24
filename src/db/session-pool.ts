import { StoredSession } from './session-store';
import { prismaStore } from './prisma-store';

export class SessionPool {
  private available: StoredSession[] = [];
  private creating: boolean = false;
  private readonly minSize: number = 1;
  private readonly maxSize: number = 2;
  private userId: string | null = null;

  constructor() {
    // Initialize pool when userId is set
    this.initPool = this.initPool.bind(this);
    this.getSession = this.getSession.bind(this);
  }

  setUserId(userId: string) {
    this.userId = userId;
    // Start filling pool when userId is set
    this.initPool();
  }

  private async initPool() {
    if (!this.userId) return;

    try {
      // Only create if below min size and not already creating
      if (this.available.length < this.minSize && !this.creating) {
        this.creating = true;
        console.log('🏊 Creating new session for pool...');
        const session = await prismaStore.addSession(this.userId);
        this.available.push(session);
        console.log('🏊 Added session to pool:', session.id);
        this.creating = false;

        // Keep filling if below max size
        if (this.available.length < this.maxSize) {
          this.initPool();
        }
      }
    } catch (error) {
      console.error('Failed to initialize session pool:', error);
      this.creating = false;
    }
  }

  async getSession(): Promise<StoredSession> {
    if (!this.userId) {
      throw new Error('Cannot get session: userId not set');
    }

    try {
      // Return from pool if available
      if (this.available.length > 0) {
        const session = this.available.shift()!;
        console.log('🏊 Using session from pool:', session.id);
        // Trigger background refill
        this.initPool();
        return session;
      }

      // Create new session if pool empty
      console.log('🏊 Pool empty, creating new session...');
      const session = await prismaStore.addSession(this.userId);
      // Trigger background refill
      this.initPool();
      return session;
    } catch (error) {
      console.error('Failed to get session from pool:', error);
      throw error;
    }
  }

  clear() {
    this.available = [];
    this.creating = false;
    this.userId = null;
  }
}

// Export singleton instance
export const sessionPool = new SessionPool();
