// server/api/database/user-handlers.ts
import { prisma } from 'src/db/prisma';

export const userHandlers = {
  async getUser(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  },

  async upsertUser({ id, email, first_name, last_name, configId }: { 
    id: string; 
    email?: string; 
    first_name?: string; 
    last_name?: string;
    configId?: string;
  }) {
    try {
      return await prisma.user.upsert({
        where: { id },
        update: {
          email,
          firstName: first_name,
          lastName: last_name,
          configId,
        },
        create: {
          id,
          email,
          firstName: first_name,
          lastName: last_name,
          configId,
        },
      });
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  },

  async deleteUser(id: string) {
    try {
      return await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },
};
