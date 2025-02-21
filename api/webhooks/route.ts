// server/api/clerk/clerk-webhooks.ts
import { Webhook } from 'svix';
import { createBasicHumeConfig, deleteHumeConfig } from '@/lib/webhooks/hume-auth';
import { createClerkClient } from '@clerk/backend';
import { userHandlers } from '@/lib/webhooks/db-handler';

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

async function handleUserCreated(event: WebhookEvent) {
 
  const { id, email_addresses, first_name, last_name } = event.data;
  const email = email_addresses[0]?.email_address;

  try {
    // Create basic Hume config
    const config = await createBasicHumeConfig(email);
    
    // Update user metadata with config ID
    await clerkClient.users.updateUser(id, {
      publicMetadata: {
        humeConfigId: config.id
      }
    });
    console.log(`Updating user metadata: ${config.id}`);

    // Create/update user in DB with their info and Hume config
    await userHandlers.upsertUser({
      id,
      email,
      first_name,
      last_name,
      configId: config.id
    });

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
    await userHandlers.upsertUser({
      id,
      email,
      first_name,
      last_name,
      configId
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

async function handleUserDeleted(event: WebhookEvent) {
  const { id } = event.data;
  
  try {
    // Get user from our database first to get the configId
    console.log('Fetching user from database...');
    const user = await userHandlers.getUser(id);
    
    if (user?.configId) {
      console.log('Deleting Hume config:', user.configId);
      await deleteHumeConfig(user.configId);
      console.log('Successfully deleted Hume config');
    } else {
      console.log('No Hume config found for user');
    }

    console.log('Deleting user from database:', id);
    await userHandlers.deleteUser(id);
    console.log('Successfully deleted user');
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export default async function handleWebhook(req: Request) {
  // Always log this regardless of debug setting
  console.log('Webhook received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return new Response('Webhook secret not configured', { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const svix = new Webhook(webhookSecret);
  const payload = await req.json();
  const headers = req.headers;
  const webhookId = headers.get('svix-id');

  if (!webhookId) {
    console.error('Missing webhook ID');
    return new Response(JSON.stringify({ 
      error: 'Missing webhook ID',
      code: 'missing_webhook_id'
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if webhook was already processed or had errors
  const existingStatus = processedWebhooks.get(webhookId);
  if (existingStatus) {
    if (existingStatus.processed) {
      return new Response(JSON.stringify({ 
        status: 'already_processed',
        message: 'This webhook was already processed successfully'
      }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If there was an error and too many attempts, reject
    if (existingStatus.attempts >= 2) {
      return new Response(JSON.stringify({ 
        error: 'Max retry attempts reached',
        code: 'max_retries_exceeded',
        details: existingStatus.error
      }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
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
    const evt = svix.verify(JSON.stringify(payload), {
      'svix-id': webhookId,
      'svix-timestamp': headers.get('svix-timestamp') || '',
      'svix-signature': headers.get('svix-signature') || '',
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
        throw new Error(`Unsupported event type: ${evt.type}`);
    }

    // Mark webhook as successfully processed
    processedWebhooks.set(webhookId, {
      processed: true,
      attempts: existingStatus?.attempts || 1
    });

    return new Response(JSON.stringify({ 
      success: true,
      status: 'processed'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

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
      return new Response(JSON.stringify({ 
        error: 'Invalid webhook signature',
        code: 'invalid_signature'
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      code: 'internal_error',
      message: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}