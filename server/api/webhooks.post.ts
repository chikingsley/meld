import { Webhook } from 'svix';
import { H3Event, defineEventHandler, createError, readBody } from 'h3';
import { createClerkClient } from '@clerk/backend';
import { useUserHandlers } from '../utils/user-handlers';
import { createHumeConfig, deleteHumeConfig } from '../utils/hume-auth';

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

interface WebhookEvent {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    public_metadata?: {
      humeConfigId?: string;
    };
  };
  type: string;
}

// Track processed webhook IDs and their status to prevent duplicates and retries
interface WebhookStatus {
  processed: boolean;
  error?: {
    message: string;
    code: string;
    timestamp: number;
  };
  attempts: number;
}

const processedWebhooks = new Map<string, WebhookStatus>();

// Cleanup old webhook records periodically
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, status] of processedWebhooks.entries()) {
    if (status.error?.timestamp && status.error.timestamp < oneHourAgo) {
      processedWebhooks.delete(id);
    }
  }
}, 60 * 60 * 1000);

export default defineEventHandler(async (event: H3Event) => {
  // Always log this regardless of debug setting
  console.log('Webhook received:', {
    method: event.node.req.method,
    url: event.node.req.url,
    headers: Object.fromEntries(Object.entries(event.node.req.headers))
  });

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return createError({
      statusCode: 500,
      message: 'Webhook secret not configured'
    });
  }

  const svix = new Webhook(webhookSecret);
  const body = await readBody(event);
  const headers = event.node.req.headers;
  const webhookId = headers['svix-id'] as string;

  if (!webhookId) {
    console.error('Missing webhook ID');
    return createError({
      statusCode: 400,
      message: 'Missing webhook ID',
      data: { code: 'missing_webhook_id' }
    });
  }

  // Check if webhook was already processed or had errors
  const existingStatus = processedWebhooks.get(webhookId);
  if (existingStatus) {
    if (existingStatus.processed) {
      return {
        status: 'already_processed',
        message: 'This webhook was already processed successfully'
      };
    }

    // If there was an error and too many attempts, reject
    if (existingStatus.attempts >= 2) {
      return createError({
        statusCode: 429,
        message: 'Max retry attempts reached',
        data: {
          code: 'max_retries_exceeded',
          details: existingStatus.error
        }
      });
    }

    // Increment attempt counter
    existingStatus.attempts += 1;
    processedWebhooks.set(webhookId, existingStatus);
  } else {
    // Initialize new webhook status
    processedWebhooks.set(webhookId, {
      processed: false,
      attempts: 1
    });
  }

  try {
    // Verify webhook signature
    const evt = svix.verify(JSON.stringify(body), {
      'svix-id': webhookId,
      'svix-timestamp': headers['svix-timestamp'] as string || '',
      'svix-signature': headers['svix-signature'] as string || '',
    }) as WebhookEvent;

    // Handle different webhook events
    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(evt);
        break;
      case 'user.updated':
        await handleUserUpdated(evt);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt);
        break;
      default:
        console.log(`Unsupported event type: ${evt.type}, ignored`);
        break;
    }

    // Mark webhook as successfully processed
    processedWebhooks.set(webhookId, {
      processed: true,
      attempts: existingStatus?.attempts || 1
    });

    return {
      success: true,
      status: 'processed'
    };

  } catch (err) {
    const error = err as Error;
    console.error('Error handling webhook:', error);

    // Update webhook status with error
    processedWebhooks.set(webhookId, {
      processed: false,
      error: {
        message: error.message,
        code: error.name,
        timestamp: Date.now()
      },
      attempts: existingStatus?.attempts || 1
    });

    // Return appropriate error response
    if (error.message.includes('Invalid webhook signature')) {
      return createError({
        statusCode: 401,
        message: 'Invalid webhook signature',
        data: { code: 'invalid_signature' }
      });
    }

    return createError({
      statusCode: 500,
      message: 'Internal server error',
      data: {
        code: 'internal_error',
        details: error.message
      }
    });
  }
});

async function handleUserCreated(event: WebhookEvent) {
  const { id, email_addresses, first_name, last_name } = event.data;
  const email = email_addresses[0]?.email_address;

  try {
    const config = await createHumeConfig(email);

    // Create a user in our database with their info
    await useUserHandlers().upsertUser({
      id,
      email,
      first_name,
      last_name,
      configId: config.id
    });

    // Update user metadata with config ID
    await clerkClient.users.updateUser(id, {
      publicMetadata: {
        humeConfigId: config.id
      }
    });
    console.log(`Updating user metadata: ${config.id}`);

    return { success: true };
  } catch (error) {
    console.error('Error in user creation:', error);
    throw error;
  }
}

async function handleUserUpdated(event: WebhookEvent) {
  const { id, email_addresses, first_name, last_name, public_metadata } = event.data;
  const email = email_addresses[0]?.email_address;
  const configId = public_metadata?.humeConfigId;

  try {
    // Update user in DB with their info
    await useUserHandlers().upsertUser({
      id,
      email,
      first_name,
      last_name,
      configId
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function handleUserDeleted(event: WebhookEvent) {
  const { id } = event.data;

  try {
    await deleteHumeConfig(id);
    await useUserHandlers().deleteUser(id);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
} 