import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe only if the API key is available
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
let stripe;

try {
  if (stripeApiKey) {
    stripe = new Stripe(stripeApiKey, {
      apiVersion: "2025-04-30.basil" as any,
    });
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error);
}

export async function POST(req: Request) {
  // Check if Stripe is initialized
  if (!stripe) {
    console.error("Stripe webhook received, but Stripe is not initialized.");
    return new NextResponse("Stripe not configured", { status: 500 });
  }

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("Stripe-Signature") as string;

  if (!signature) {
    return new NextResponse("No signature found", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error("Webhook signature verification failed:", error.message);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  // Handle the event based on its type
  try {
    switch (event.type) {
      case "checkout.session.completed":
        const checkoutSession = event.data.object as Stripe.Checkout.Session;
        
        // Only process if this is a subscription checkout
        if (checkoutSession.mode === 'subscription' && checkoutSession.subscription) {
          // Get the subscription details to check its status
          try {
            const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription as string);
            // You could add additional logic here like sending welcome emails,
            // updating user records, etc.
          } catch (error) {
            console.error("Error retrieving subscription details:", error);
          }
        }
        break;
        
      case "customer.subscription.updated":
        const updatedSubscription = event.data.object as Stripe.Subscription;
        
        // Get customer metadata to identify the user
        if (updatedSubscription.customer) {
          try {
            const customer = await stripe.customers.retrieve(updatedSubscription.customer as string);
            if (typeof customer !== 'string' && customer.metadata?.userId) {
              // Here you could update your database or trigger other actions
              // based on the subscription status change
            }
          } catch (error) {
            console.error("Error retrieving customer:", error);
          }
        }
        break;
        
      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription;
        
        // Get customer metadata to identify the user
        if (deletedSubscription.customer) {
          try {
            const customer = await stripe.customers.retrieve(deletedSubscription.customer as string);
            if (typeof customer !== 'string' && customer.metadata?.userId) {
              // Here you could update your database to reflect the cancellation
              // send cancellation emails, etc.
            }
          } catch (error) {
            console.error("Error retrieving customer:", error);
          }
        }
        break;

      case "invoice.payment_succeeded":
        const invoice = event.data.object as Stripe.Invoice;
        break;

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice;
        // You could implement retry logic or notify the user here
        break;

      default:
        // Unhandled event type
        break;
    }

    // Always return 200 to acknowledge receipt of the webhook
    return new NextResponse(JSON.stringify({ received: true }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
} 