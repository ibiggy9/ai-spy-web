import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripeApiKey = process.env.STRIPE_SECRET_KEY;
const monthlyPriceId = process.env.STRIPE_MONTHLY_PRICE_ID;
let stripe;

try {
  if (stripeApiKey) {
    stripe = new Stripe(stripeApiKey, {
      apiVersion: "2025-04-30.basil" as any,
    });
  } else {
    console.error("STRIPE_SECRET_KEY is not defined in environment variables");
  }
} catch (error) {
  console.error("Failed to initialize Stripe");
}

export async function GET() {
  try {
    if (!stripe) {
      return NextResponse.json(
        {
          error: "Stripe is not properly configured. Missing API key.",
          status: "error",
        },
        { status: 500 },
      );
    }

    const config = {
      priceIdConfigured: Boolean(monthlyPriceId),
      priceIdValue: monthlyPriceId ? "redacted" : null,
      priceIdIsValid: monthlyPriceId
        ? monthlyPriceId.startsWith("price_")
        : false,
      stripeInitialized: Boolean(stripe),
      apiUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    };

    let priceDetails = null;
    if (monthlyPriceId && stripe) {
      try {
        const price = await stripe.prices.retrieve(monthlyPriceId);
        priceDetails = {
          id: price.id,
          productId: price.product,
          amount: price.unit_amount / 100,
          currency: price.currency,
          recurring: price.recurring
            ? {
                interval: price.recurring.interval,
                intervalCount: price.recurring.interval_count,
              }
            : null,
        };

        if (typeof price.product === "string") {
          const product = await stripe.products.retrieve(price.product);
          priceDetails.productName = product.name;
          priceDetails.productDescription = product.description;
        }
      } catch (error) {
        priceDetails = { error: error.message };
      }
    }

    return NextResponse.json({
      status: "success",
      config,
      priceDetails,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextPublicVercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to check Stripe configuration", status: "error" },
      { status: 500 },
    );
  }
}
