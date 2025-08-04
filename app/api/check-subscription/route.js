import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Simple rate limiting for API routes
const rateLimitMap = new Map();

function rateLimit(identifier, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }
  
  const requests = rateLimitMap.get(identifier);
  // Remove old requests outside the window
  const validRequests = requests.filter(time => time > windowStart);
  
  if (validRequests.length >= limit) {
    return false; // Rate limit exceeded
  }
  
  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
  return true; // Request allowed
}

// Initialize Stripe only if the API key is available
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
let stripe;

try {
  if (stripeApiKey) {
    stripe = new Stripe(stripeApiKey, {
      apiVersion: "2025-04-30.basil",
    });
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error);
}

export async function GET(request) {
  try {
    // Rate limiting based on IP address
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : request.headers.get("x-real-ip") || "unknown";
    
    if (!rateLimit(`subscription-check-${ip}`, 20, 60000)) { // 20 requests per minute
      return NextResponse.json(
        { error: "Rate limit exceeded" }, 
        { status: 429 }
      );
    }
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ hasSubscription: false });
    }

    // If Stripe is not initialized, return a mock response
    if (!stripe) {
      return NextResponse.json({ 
        hasSubscription: false,
        warning: "Stripe API key not configured"
      });
    }

    // Validate and sanitize userId to prevent injection
    if (!userId || typeof userId !== 'string' || userId.length > 100) {
      return NextResponse.json({ hasSubscription: false });
    }
    
    // Sanitize userId - only allow alphanumeric, hyphens, and underscores
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (sanitizedUserId !== userId) {
      return NextResponse.json({ hasSubscription: false });
    }
    
    const customerSearchResults = await stripe.customers.search({
      query: `metadata['userId']:'${sanitizedUserId}'`,
      limit: 10
    });

    const customers = customerSearchResults.data;
    
    if (customers.length === 0) {
      return NextResponse.json({ 
        hasSubscription: false
      });
    }

    // For each customer, check if they have an active subscription
    let hasActiveSubscription = false;
    let subscriptionDetails = null;

    for (const customer of customers) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });
      
      // Check for active subscriptions
      const activeSubscriptions = subscriptions.data.filter(sub => sub.status === 'active');
      
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
      subscriptionDetails: subscriptionDetails
    };
    
    const jsonResponse = NextResponse.json(response);
    
    // Add security headers
    jsonResponse.headers.set('X-Content-Type-Options', 'nosniff');
    jsonResponse.headers.set('X-Frame-Options', 'DENY');
    jsonResponse.headers.set('X-XSS-Protection', '1; mode=block');
    jsonResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return jsonResponse;
  } catch (error) {
    const errorResponse = NextResponse.json({ 
      hasSubscription: false, 
      error: "Failed to check subscription status"
    }, { status: 500 });
    
    // Add security headers to error response
    errorResponse.headers.set('X-Content-Type-Options', 'nosniff');
    errorResponse.headers.set('X-Frame-Options', 'DENY');
    errorResponse.headers.set('X-XSS-Protection', '1; mode=block');
    errorResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return errorResponse;
  }
} 