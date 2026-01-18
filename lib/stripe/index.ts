import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover' as any,
  typescript: true,
});

// 月額980円のサブスクリプション
export const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_parent_subscription';
export const SUBSCRIPTION_AMOUNT = 980; // ¥980

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

export async function createCustomer(email: string, userId: string) {
  return await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
