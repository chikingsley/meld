import { useRedisClient } from '../../utils/redis-client';
import { prisma } from '../../utils/prisma-client';
import { H3Event, defineEventHandler } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  const statusResults = {
    status: "online",
    timestamp: new Date().toISOString(),
    services: {
      redis: {
        status: "unknown",
        version: null as string | null,
        error: null as string | null
      },
      prisma: {
        status: "unknown",
        version: null as string | null,
        error: null as string | null
      },
      clerk: {
        status: "unknown",
        configured: Boolean(process.env.CLERK_SECRET_KEY),
        webhookConfigured: Boolean(process.env.CLERK_WEBHOOK_SECRET),
        error: null as string | null
      }
    }
  };

  // Test Redis connection
  try {
    const redis = useRedisClient();
    const pong = await redis.ping();
    
    statusResults.services.redis = {
      status: pong === 'PONG' ? "online" : "degraded",
      version: "Upstash Redis",
      error: null
    };
  } catch (error) {
    console.error('Redis connection error:', error);
    statusResults.services.redis = {
      status: "offline",
      version: null,
      error: (error as Error).message
    };
  }

  // Test Prisma connection
  try {
    // Just run a simple query to verify connection
    const count = await prisma.$queryRaw`SELECT 1`;
    statusResults.services.prisma = {
      status: "online",
      version: "Prisma Client",
      error: null
    };
  } catch (error) {
    console.error('Prisma connection error:', error);
    statusResults.services.prisma = {
      status: "offline",
      version: null,
      error: (error as Error).message
    };
  }

  // Return overall status
  const services = Object.values(statusResults.services);
  const hasOffline = services.some(s => s.status === "offline");
  const hasDegraded = services.some(s => s.status === "degraded");
  
  if (hasOffline) {
    statusResults.status = "degraded";
  } else if (hasDegraded) {
    statusResults.status = "degraded";
  }

  return statusResults;
}); 