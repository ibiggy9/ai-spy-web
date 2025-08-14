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
  console.error("Failed to initialize Stripe");
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

    const canceledSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: true,
      },
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        current_period_end: canceledSubscription.current_period_end,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 },
    );
  }
}
