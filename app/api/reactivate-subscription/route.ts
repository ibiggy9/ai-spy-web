import { auth } from "@clerk/nextjs/server";
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
  console.error("Failed to initialize Stripe:", error);
}

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json(
        {
          error: "Payment service not configured",
        },
        { status: 500 },
      );
    }

    const customerSearchResults = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });

    if (customerSearchResults.data.length === 0) {
      return NextResponse.json(
        {
          error: "No subscription found",
        },
        { status: 404 },
      );
    }

    const customer = customerSearchResults.data[0];

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        {
          error: "No active subscription found",
        },
        { status: 404 },
      );
    }

    const subscription = subscriptions.data[0];

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        {
          error: "Subscription is not scheduled for cancellation",
        },
        { status: 400 },
      );
    }

    const reactivatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: false,
      },
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: reactivatedSubscription.id,
        status: reactivatedSubscription.status,
        cancel_at_period_end: reactivatedSubscription.cancel_at_period_end,
        current_period_end: reactivatedSubscription.current_period_end,
      },
    });
  } catch (error) {
    console.error("❌ Error reactivating subscription:", error);
    return NextResponse.json(
      {
        error: `Failed to reactivate subscription: ${error.message}`,
        details: error.message,
      },
      { status: 500 },
    );
  }
}
