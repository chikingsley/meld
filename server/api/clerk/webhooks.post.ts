import { defineEventHandler, readBody, getHeader } from 'h3';
// Using svix directly for webhook validation
import { Webhook } from 'svix';

// Define event data structure
interface WebhookEvent {
  data: {
    id: string;
    [key: string]: any;
  };
  type: string;
  object: string;
}

export default defineEventHandler(async (event) => {
  try {
    // Get the webhook signature from the request headers
    const svix_id = getHeader(event, 'svix-id');
    const svix_timestamp = getHeader(event, 'svix-timestamp');
    const svix_signature = getHeader(event, 'svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return {
        status: 400,
        body: { error: 'Missing Svix headers' }
      };
    }

    // Get the webhook secret from environment variables
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      return {
        status: 500,
        body: { error: 'Server configuration error' }
      };
    }

    // Get the request body
    const body = await readBody(event);
    
    // Convert the body to a string if it's not already
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    
    // Create a new Svix instance directly
    const wh = new Webhook(WEBHOOK_SECRET);
    
    // Verify the webhook and cast to our interface
    const evt = wh.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;

    // Get the ID and type from the verified event data
    const { id } = evt.data;
    const eventType = evt.type;
    
    console.log(`Webhook received via Nitro: ${eventType} for ID: ${id}`);

    // Handle different event types
    switch (eventType) {
      case 'user.created':
        console.log(`User created: ${id}`);
        // Implement user creation logic here
        break;
      case 'user.updated':
        console.log(`User updated: ${id}`);
        // Implement user update logic here
        break;
      case 'user.deleted':
        console.log(`User deleted: ${id}`);
        // Implement user deletion logic here
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return {
      success: true,
      message: `Webhook processed: ${eventType}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      status: 400,
      body: {
        success: false,
        error: 'Invalid webhook signature',
        message: error.message
      }
    };
  }
}); 