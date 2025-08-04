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

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      return NextResponse.json({ 
        error: "Payment service not configured" 
      }, { status: 500 });
    }

    // Find the customer
    const customerSearchResults = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1
    });

    if (customerSearchResults.data.length === 0) {
      return NextResponse.json({ 
        invoices: [],
        subscriptions: []
      });
    }

    const customer = customerSearchResults.data[0];

    // Get invoices
    const invoices = await stripe.invoices.list({
      customer: customer.id,
      limit: 100,
    });

    // Get subscriptions (including canceled ones)
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      limit: 10,
    });

    // Format the data
    const formattedInvoices = invoices.data.map(invoice => {
      return {
        id: invoice.id,
        amount_paid: invoice.amount_paid,
        amount_due: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        number: invoice.number,
      };
    });

    const formattedSubscriptions = subscriptions.data.map(subscription => {
      // Handle missing period data by calculating from available data
      let calculated_period_start = subscription.current_period_start;
      let calculated_period_end = subscription.current_period_end;

      // If period data is missing but we have a subscription, try to calculate
      if (!calculated_period_start && !calculated_period_end) {
        // Use start_date or created as fallback for period start
        const baseDate = subscription.start_date || subscription.created;
        if (baseDate) {
          calculated_period_start = baseDate;
          
          // Calculate end date based on billing interval
          const interval = subscription.items.data[0]?.price?.recurring?.interval;
          if (interval === 'month') {
            const startDate = new Date(baseDate * 1000);
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
            calculated_period_end = Math.floor(endDate.getTime() / 1000);
          }
        }
      }

      return {
        id: subscription.id,
        status: subscription.status,
        current_period_start: calculated_period_start,
        current_period_end: calculated_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at,
        created: subscription.created,
        items: subscription.items.data.map(item => ({
          price: {
            id: item.price.id,
            unit_amount: item.price.unit_amount,
            currency: item.price.currency,
            recurring: item.price.recurring,
          }
        }))
      };
    });

    return NextResponse.json({
      invoices: formattedInvoices,
      subscriptions: formattedSubscriptions,
      customer: {
        id: customer.id,
        email: customer.email,
        created: customer.created,
      }
    });

  } catch (error) {
    console.error("Error fetching billing history:", error);
    return NextResponse.json({ 
      error: "Failed to fetch billing history" 
    }, { status: 500 });
  }
} 