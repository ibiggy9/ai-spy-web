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

const MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;

export async function POST(req) {
  try {
    const authData = await auth();

    const { userId } = authData;

    if (!userId) {
      return NextResponse.json(
        {
          redirect: true,
          url: "https://accounts.ai-spy.xyz/sign-in",
          error: "Authentication required",
        },
        { status: 401 },
      );
    }

    if (
      !stripe ||
      !MONTHLY_PRICE_ID ||
      !MONTHLY_PRICE_ID.startsWith("price_")
    ) {
      return NextResponse.json(
        { error: "Payments are not configured." },
        { status: 503 },
      );
    }

    const customer = await stripe.customers.create({
      metadata: {
        userId: userId,
      },
    });

    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.ai-spy.xyz"}/?subscription=success`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.ai-spy.xyz"}/subscribe?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [{ price: MONTHLY_PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }
}
