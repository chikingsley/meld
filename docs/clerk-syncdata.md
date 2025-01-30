# Sync Clerk data to your app with webhooks

Here's a guide on setting up Clerk webhooks to sync data with your Next.js app. This focuses on the `user.created` event, but the principles apply to other Clerk events.

**Key Concepts:**

*   **Webhooks:** Clerk sends event notifications to your app via HTTP requests (webhooks).
*   **`user.created` Event:** Triggers when a new user registers or is created. Ideal for initial data insertion.
*   **`user.updated` Event:** Triggers when user info changes. Use for keeping data in sync.
*   **`user.deleted` Event:** Triggers when an account is deleted. Use to remove or flag data.

**Keep these two tabs open:**
*  Clerk Webhooks page: [https://dashboard.clerk.com/last-active?path=webhooks](https://dashboard.clerk.com/last-active?path=webhooks)
*  ngrok dashboard: [https://dashboard.ngrok.com/](https://dashboard.ngrok.com/)

## 1. Set Up ngrok

ngrok creates a secure tunnel to expose your local server to the internet for testing webhooks.

1.  Create an account on the [ngrok website](https://dashboard.ngrok.com/signup).
2.  Follow [ngrok's install guide](https://ngrok.com/docs/getting-started/#step-1-install) steps 1 & 2.
3.  In ngrok dashboard, go to **Domains**.
4.  Click **Create Domain**.
5.  Copy the command from the "Start a Tunnel" panel. It should look like `ngrok http --url=fawn-two-nominally.ngrok-free.app 80`.
6.  Open your terminal, paste the command, and replace `80` with your server's port (e.g., `3000`). Run the command.
7.  ngrok will generate a **Forwarding** URL (e.g., `https://fawn-two-nominally.ngrok-free.app`). **Save this**.

## 2. Set Up a Webhook Endpoint in Clerk

1.  Go to the [Clerk **Webhooks**](https://dashboard.clerk.com/last-active?path=webhooks) page in the Clerk Dashboard.
2.  Click **Add Endpoint**.
3.  In the **Endpoint URL** field, paste your ngrok **Forwarding** URL, followed by `/api/webhooks` (e.g., `https://fawn-two-nominally.ngrok-free.app/api/webhooks`).
4.  In **Subscribe to events**, select `user.created`.
5.  Click **Create**.  You'll be redirected to the endpoint's settings page, leave this open.

## 3. Add Signing Secret to `.env.local`

Clerk provides a **Signing Secret** to verify the authenticity of webhooks.

1.  Copy the **Signing Secret** from the Clerk endpoint settings page.
2.  In your project's root, open or create `.env.local` and add the **Signing Secret** as an environment variable:

```
SIGNING_SECRET=your_signing_secret_here
```

## 4. Set Webhook Route as Public in Middleware

Webhooks don't contain authentication, so the route needs to be public. In your middleware, make sure the `/api/webhooks(.*)` route is public, check the [`clerkMiddleware()` guide](https://clerk.com/docs/references/nextjs/clerk-middleware) for more.

## 5. Install `svix`

`svix` is used to verify the webhook signature. Install it with:

```bash
npm install svix
```

## 6. Create the Endpoint

Create a Route Handler in `app/api/webhooks/route.ts` to verify the webhook using `svix` and process the payload:

```typescript
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.SIGNING_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add SIGNING_SECRET from Clerk Dashboard to .env.local');
  }

  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const webhook = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = webhook.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured -- invalid signature', {
      status: 400,
    });
  }

  const { type } = evt;

    if (type === 'user.created') {
        const { id, first_name, last_name, email_addresses } = evt.data;
        console.log('User Created:', {id, first_name, last_name, email_addresses});
    }

  return new Response('', { status: 200 });
}
```

**Key points:**

*   The code gets the signing secret from environment variables.
*   It uses `svix` to verify the signature.
*   It narrows the `WebhookEvent` to `user.created` for type safety.
*   Logs the user data to the console.
*   Returns `200` to stop retries

**Type Imports:**
If you want to manually handle the types from the webhook you can import the types below from the backend SDK
```
import {
    DeletedObjectJSON,
    EmailJSON,
    OrganizationInvitationJSON,
    OrganizationJSON,
    OrganizationMembershipJSON,
    SessionJSON,
    SMSMessageJSON,
    UserJSON,
} from '@clerk/nextjs/server'
```

## 7. Test the Webhook

1.  Start your Next.js server.
2.  Go to the **Testing** tab on your webhook endpoint's settings page in the Clerk Dashboard.
3.  Select `user.created` from the **Select event** dropdown.
4.  Click **Send Example**.
5.  Check the **Message Attempts** section to confirm it shows `Succeeded`.

### Handling Failed Messages

1.  In **Message Attempts**, click on a `Failed` event.
2.  In **Webhook Attempts**, check the error in the **Status** column.
3.  Use the [Debug your webhooks](https://clerk.com/docs/webhooks/debug-your-webhooks) guide to resolve the error.

## 8. Trigger the Webhook

To trigger a `user.created` event:

1.  Edit user data in the Clerk Dashboard.
2.  Edit user data with the `<UserProfile />` component.

You should see the webhook payload in your terminal's console logs and in the Clerk Dashboard in the webhooks attempt.
