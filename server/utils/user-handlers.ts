import { prisma } from './prisma-client';

interface UserData {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  configId?: string;
}

export function useUserHandlers() {
  /**
   * Create or update a user in the database
   */
  const upsertUser = async (userData: UserData) => {
    try {
      const { id, email, first_name, last_name, configId } = userData;

      const user = await prisma.user.upsert({
        where: { id },
        update: {
          email: email || undefined,
          firstName: first_name || undefined,
          lastName: last_name || undefined,
          configId: configId || undefined,
        },
        create: {
          id,
          email: email || null,
          firstName: first_name || null,
          lastName: last_name || null,
          configId: configId || null,
        },
      });

      return user;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  };

  /**
   * Get a user from the database by ID
   */
  const getUser = async (userId: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  };

  /**
   * Delete a user from the database
   */
  const deleteUser = async (userId: string) => {
    try {
      await prisma.user.delete({
        where: { id: userId },
      });
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  return {
    upsertUser,
    getUser,
    deleteUser,
  };
} 