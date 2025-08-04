import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe only if the API key is available
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
  console.error("Failed to initialize Stripe:", error);
}

export async function GET() {
  try {
    // Check if Stripe is initialized
    if (!stripe) {
      return NextResponse.json({ 
        error: "Payment service not configured",
        amount: 4.99, // Fallback to hardcoded price
        currency: "usd"
      }, { status: 200 }); // Return 200 with fallback data
    }

    // Check if price ID is configured
    if (!monthlyPriceId) {
      return NextResponse.json({ 
        error: "Price not configured",
        amount: 4.99, // Fallback to hardcoded price
        currency: "usd"
      }, { status: 200 }); // Return 200 with fallback data
    }

    // Fetch price details from Stripe
    const price = await stripe.prices.retrieve(monthlyPriceId);
    
    let productName = "";
    let productDescription = "";
    
    // Get product details if available
    if (typeof price.product === 'string') {
      try {
        const product = await stripe.products.retrieve(price.product);
        productName = product.name || "";
        productDescription = product.description || "";
      } catch (error) {
        console.warn("Could not retrieve product details:", error);
      }
    }

    return NextResponse.json({
      success: true,
      amount: price.unit_amount ? price.unit_amount / 100 : 20,
      currency: price.currency || "usd",
      recurring: price.recurring ? {
        interval: price.recurring.interval,
        intervalCount: price.recurring.interval_count
      } : null,
      productName,
      productDescription
    });

  } catch (error) {
    console.error("Error fetching subscription price:", error);
    
    // Return fallback price on error
    return NextResponse.json({
      error: "Could not fetch current pricing",
      amount: 20, // Fallback to hardcoded price
      currency: "usd",
      fallback: true
    }, { status: 200 }); // Return 200 with fallback data
  }
} 