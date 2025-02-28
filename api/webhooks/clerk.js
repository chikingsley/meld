import { Webhook } from '@clerk/backend';

// This is your Vercel serverless function for handling Clerk webhooks
export default async function handler(req, res) {
  // Only allow POST requests for webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the webhook signature from the Clerk-Signature header
    const svix_id = req.headers['svix-id'];
    const svix_timestamp = req.headers['svix-timestamp'];
    const svix_signature = req.headers['svix-signature'];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('Missing Svix headers');
      return res.status(400).json({ error: 'Missing Svix headers' });
    }

    // Get the webhook secret from environment variables
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
      console.error('Missing webhook secret');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Parse the request body as a string
    const payload = JSON.stringify(req.body);
    
    // Create a new webhook instance with the secret
    const webhook = new Webhook(WEBHOOK_SECRET);
    
    // Verify the webhook signature
    const evt = webhook.verify(payload, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });

    // Get the ID and type
    const { id } = evt.data;
    const eventType = evt.type;
    
    console.log(`Webhook received: ${eventType} for ID: ${id}`);

    // Handle different event types
    switch (eventType) {
      case 'user.created':
        // Handle user creation
        console.log(`User created: ${id}`);
        break;
      case 'user.updated':
        // Handle user update
        console.log(`User updated: ${id}`);
        break;
      case 'user.deleted':
        // Handle user deletion
        console.log(`User deleted: ${id}`);
        break;
      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    // Return a 200 OK response
    return res.status(200).json({ 
      success: true, 
      message: `Webhook processed: ${eventType}`,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(400).json({ 
      success: false,
      error: 'Invalid webhook signature',
      message: error.message
    });
  }
} 