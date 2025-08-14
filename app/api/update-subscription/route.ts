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

export async function POST(req: Request) {
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

    const { priceId } = await req.json();

    if (!priceId) {
      return NextResponse.json(
        {
          error: "Price ID is required",
        },
        { status: 400 },
      );
    }

    const customerSearchResults = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    });

    if (customerSearchResults.data.length === 0) {
      return NextResponse.json(
        {
          error: "No customer found",
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
    const subscriptionItem = subscription.items.data[0];

    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        items: [
          {
            id: subscriptionItem.id,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
      },
    );

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        current_period_end: updatedSubscription.current_period_end,
        items: updatedSubscription.items.data.map((item) => ({
          price: {
            id: item.price.id,
            unit_amount: item.price.unit_amount,
            currency: item.price.currency,
            recurring: item.price.recurring,
          },
        })),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 },
    );
  }
}
