import { Webhook } from 'svix';
import { createBasicHumeConfig, deleteHumeConfig } from '@/utils/hume-auth';
import { createClerkClient } from '@clerk/backend';
import { userOps } from '@/lib/db';

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

// Track processed webhook IDs to prevent duplicates
const processedWebhooks = new Set<string>();

async function handleUserCreated(event: WebhookEvent) {
  const { id, email_addresses, first_name, last_name } = event.data;
  const email = email_addresses[0]?.email_address;

  if (!email) {
    console.error('No email found for user:', id);
    return;
  }

  try {
    // Create basic Hume config
    const config = await createBasicHumeConfig(email);
    console.log('Created Hume config:', { 
      id: config.id, 
      name: config.name,
      version: config.version 
    });
    
    // Update user metadata with config ID
    await clerkClient.users.updateUser(id, {
      publicMetadata: {
        humeConfigId: config.id
      }
    });

    // Create/update user in local DB
    await userOps.upsertUser({
      id,
      email,
      firstName: first_name,
      lastName: last_name
    });

    // Update Hume config in local DB
    await userOps.updateHumeConfig(id, config.id);

  } catch (error) {
    console.error('Error in user creation:', error);
    throw error;
  }
}

async function handleUserUpdated(event: WebhookEvent) {
  const { id, email_addresses, first_name, last_name } = event.data;
  const email = email_addresses[0]?.email_address;

  try {
    await userOps.upsertUser({
      id,
      email,
      firstName: first_name,
      lastName: last_name
    });
  } catch (error) {
    console.error('Error in user update:', error);
    throw error;
  }
}

async function handleUserDeleted(event: WebhookEvent) {
  const { id, public_metadata } = event.data;
  const configId = public_metadata?.humeConfigId;

  try {
    if (configId) {
      await deleteHumeConfig(configId);
    }
    // No need to delete from local DB - it will cascade automatically
  } catch (error) {
    console.error('Error in user deletion:', error);
    throw error;
  }
}

export default async function handleWebhook(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const svix = new Webhook(webhookSecret);
  const payload = await req.json();
  const headers = req.headers;

  try {
    // Verify webhook signature
    const evt = svix.verify(JSON.stringify(payload), {
      'svix-id': headers.get('svix-id') || '',
      'svix-timestamp': headers.get('svix-timestamp') || '',
      'svix-signature': headers.get('svix-signature') || '',
    }) as WebhookEvent;

    // Prevent duplicate processing
    const webhookId = headers.get('svix-id');
    if (webhookId && processedWebhooks.has(webhookId)) {
      return Response.json({ success: true, status: 'already_processed' });
    }

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
    }

    // Mark webhook as processed
    if (webhookId) {
      processedWebhooks.add(webhookId);
      // Cleanup old webhook IDs after 1 hour
      setTimeout(() => processedWebhooks.delete(webhookId), 60 * 60 * 1000);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('Error handling webhook:', err);
    return new Response('Invalid webhook signature', { status: 400 });
  }
}