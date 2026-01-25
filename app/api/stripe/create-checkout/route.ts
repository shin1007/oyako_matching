import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, createCustomer, createCheckoutSession, SUBSCRIPTION_PRICE_ID } from '@/lib/stripe';

import { writeAuditLog } from '@/lib/audit-log';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();


    if (!user) {
      await writeAuditLog({
        userId: null,
        eventType: 'payment_create',
        detail: 'Unauthorized',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, email } = body;

    // Verify the userId matches the authenticated user

    if (userId !== user.id) {
      await writeAuditLog({
        userId: user.id,
        eventType: 'payment_create',
        detail: 'Forbidden: userId mismatch',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if customer already exists
    let customerId: string;
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (subscription?.stripe_customer_id) {
      customerId = subscription.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await createCustomer(email, userId);
      customerId = customer.id;
    }

    // Create checkout session
    const session = await createCheckoutSession(
      customerId,
      SUBSCRIPTION_PRICE_ID,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      `${process.env.NEXT_PUBLIC_APP_URL}/payments/subscribe?canceled=true`
    );

    await writeAuditLog({
      userId: user.id,
      eventType: 'payment_create',
      detail: 'Created checkout session',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { userId, email },
    });
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout session creation error:', error);
    await writeAuditLog({
      userId: null,
      eventType: 'payment_create',
      detail: 'Unexpected error',
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      meta: { error: error?.message },
    });
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
