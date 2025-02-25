// Add this to a new endpoint or to your health check endpoint
import { prisma } from '../../../src/db/prisma';

export async function testPrismaConnection(req: Request) {
    try {
      // Try to count sessions - a simple operation that should work
      const sessionCount = await prisma.session.count();
      
      // Try to count messages
      const messageCount = await prisma.message.count();
      
      // Check schema information
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      return Response.json({
        success: true,
        connection: "OK",
        counts: {
          sessions: sessionCount,
          messages: messageCount
        },
        tables
      });
    } catch (error) {
      console.error('Database connection test failed:', error);
      return Response.json({
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack
      }, { status: 500 });
    }
  }