import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const rateLimitMap = new Map();

function rateLimit(identifier, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }

  const requests = rateLimitMap.get(identifier);
  const validRequests = requests.filter((time) => time > windowStart);

  if (validRequests.length >= limit) {
    return false;
  }

  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
  return true;
}
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
let stripe;

try {
  if (stripeApiKey) {
    stripe = new Stripe(stripeApiKey, {
      apiVersion: "2025-04-30.basil",
    });
  }
} catch (error) {
  console.error("Failed to initialize Stripe");
}

export async function GET(request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0]
      : request.headers.get("x-real-ip") || "unknown";

    if (!rateLimit(`subscription-check-${ip}`, 20, 60000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ hasSubscription: false });
    }
    if (!stripe) {
      return NextResponse.json({
        hasSubscription: false,
        warning: "Stripe API key not configured",
      });
    }
    if (!userId || typeof userId !== "string" || userId.length > 100) {
      return NextResponse.json({ hasSubscription: false });
    }
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitizedUserId !== userId) {
      return NextResponse.json({ hasSubscription: false });
    }

    const customerSearchResults = await stripe.customers.search({
      query: `metadata['userId']:'${sanitizedUserId}'`,
      limit: 10,
    });

    const customers = customerSearchResults.data;

    if (customers.length === 0) {
      return NextResponse.json({
        hasSubscription: false,
      });
    }

    let hasActiveSubscription = false;
    let subscriptionDetails = null;

    for (const customer of customers) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });

      const activeSubscriptions = subscriptions.data.filter(
        (sub) => sub.status === "active",
      );

      if (activeSubscriptions.length > 0) {
        hasActiveSubscription = true;
        subscriptionDetails = {
          id: activeSubscriptions[0].id,
          status: activeSubscriptions[0].status,
          current_period_end: activeSubscriptions[0].current_period_end,
          created: activeSubscriptions[0].created,
        };
        break;
      }
    }
    const response = {
      hasSubscription: hasActiveSubscription,
      subscriptionDetails: subscriptionDetails,
    };

    const jsonResponse = NextResponse.json(response);

    jsonResponse.headers.set("X-Content-Type-Options", "nosniff");
    jsonResponse.headers.set("X-Frame-Options", "DENY");
    jsonResponse.headers.set("X-XSS-Protection", "1; mode=block");
    jsonResponse.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin",
    );

    return jsonResponse;
  } catch (error) {
    const errorResponse = NextResponse.json(
      { hasSubscription: false, error: "Failed to check subscription status" },
      { status: 500 },
    );

    errorResponse.headers.set("X-Content-Type-Options", "nosniff");
    errorResponse.headers.set("X-Frame-Options", "DENY");
    errorResponse.headers.set("X-XSS-Protection", "1; mode=block");
    errorResponse.headers.set(
      "Referrer-Policy",
      "strict-origin-when-cross-origin",
    );

    return errorResponse;
  }
}
