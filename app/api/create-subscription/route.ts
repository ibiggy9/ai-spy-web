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
  } else {
    console.error("STRIPE_SECRET_KEY is not defined in environment variables");
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error);
}

const MONTHLY_PRICE_ID = process.env.STRIPE_MONTHLY_PRICE_ID;
if (!MONTHLY_PRICE_ID) {
  console.error("STRIPE_MONTHLY_PRICE_ID is not defined in environment variables");
} else if (!MONTHLY_PRICE_ID.startsWith('price_')) {
  console.error(`STRIPE_MONTHLY_PRICE_ID appears to be invalid: ${MONTHLY_PRICE_ID.substring(0, 10)}... - should start with 'price_'`);
}

export async function POST(req) {
  try {
    const authData = await auth();
    
    const { userId } = authData;
    
    if (!userId) {
      return NextResponse.json({ 
        redirect: true,
        url: "https://accounts.ai-spy.xyz/sign-in",
        error: "Authentication required"
      }, { status: 401 });
    }
    
    if (!stripe) {
      console.error("Stripe is not properly configured. Missing API key.");
      return NextResponse.json({ 
        error: "Payment service is not configured correctly. Please contact support."
      }, { status: 500 });
    }

    if (!MONTHLY_PRICE_ID) {
      console.error("STRIPE_MONTHLY_PRICE_ID is missing");
      return NextResponse.json({ 
        error: "Subscription price is not configured. Please contact support."
      }, { status: 500 });
    }

    if (!MONTHLY_PRICE_ID.startsWith('price_')) {
      console.error(`STRIPE_MONTHLY_PRICE_ID appears to be invalid: ${MONTHLY_PRICE_ID}`);
      return NextResponse.json({ 
        error: "Subscription price ID is invalid. Please contact support."
      }, { status: 500 });
    }
    
    const customer = await stripe.customers.create({
      metadata: {
        userId: userId,
      },
    });
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let cleanBaseUrl = baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    
    if (cleanBaseUrl.includes('/api/webhook')) {
        cleanBaseUrl = cleanBaseUrl.split('/api/webhook')[0];
    }
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.ai-spy.xyz'}/?subscription=success`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.ai-spy.xyz'}/subscribe?canceled=true`;
    
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      line_items: [
        {
          price: MONTHLY_PRICE_ID, // Use the price ID from your Stripe dashboard
          quantity: 1,
        },
      ],
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
  } catch (error) {
    console.error("Error creating subscription:", error);
    
    // Provide more detailed error response
    let errorMessage = "Failed to create subscription";
    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe error: ${error.message}`;
      console.error("Stripe error details:", error.type, error.code);
    }
    
    return NextResponse.json({
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}