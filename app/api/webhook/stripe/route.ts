import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeApiKey = process.env.STRIPE_SECRET_KEY;
let stripe;

try {
  if (stripeApiKey) {
    stripe = new Stripe(stripeApiKey, {
      apiVersion: "2025-04-30.basil" as any,
    });
  }
} catch (error) {
  console.error("Failed to initialize Stripe");
}

export async function POST(req: Request) {
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
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return new NextResponse("Webhook signature verification failed", {
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        if (
          checkoutSession.mode === "subscription" &&
          checkoutSession.subscription
        ) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              checkoutSession.subscription as string,
            );
          } catch (error) {
            console.error("Error retrieving subscription details:", error);
          }
        }
        break;

      case "customer.subscription.updated":
        const updatedSubscription = event.data.object as Stripe.Subscription;

        if (updatedSubscription.customer) {
          try {
            const customer = await stripe.customers.retrieve(
              updatedSubscription.customer as string,
            );
            if (typeof customer !== "string" && customer.metadata?.userId) {
            }
          } catch (error) {
            console.error("Error retrieving customer:", error);
          }
        }
        break;

      case "customer.subscription.deleted":
        const deletedSubscription = event.data.object as Stripe.Subscription;

        if (deletedSubscription.customer) {
          try {
            const customer = await stripe.customers.retrieve(
              deletedSubscription.customer as string,
            );
            if (typeof customer !== "string" && customer.metadata?.userId) {
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

        break;

      default:
        break;
    }

    return new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch {
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
