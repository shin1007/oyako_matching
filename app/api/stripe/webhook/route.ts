import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { logAuditEventServer } from '@/lib/utils/auditLoggerServer';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get user ID from customer metadata
        const customer = await stripe.customers.retrieve(customerId);
        if ('deleted' in customer && customer.deleted) break;

        const userId = (customer as Stripe.Customer).metadata?.userId;
        if (!userId) break;

        // Upsert subscription
        const subData: any = subscription;
        await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          status: subscription.status as any,
          current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
        });

        // 監査ログ記録
        await logAuditEventServer({
          user_id: userId,
          event_type: event.type,
          target_table: 'subscriptions',
          target_id: subscription.id,
          description: `サブスクリプション${event.type === 'customer.subscription.created' ? '作成' : '更新'}`,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        // 監査ログ記録
        await logAuditEventServer({
          event_type: event.type,
          target_table: 'subscriptions',
          target_id: subscription.id,
          description: 'サブスクリプション削除',
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceData: any = invoice;
        const subscriptionId = invoiceData.subscription as string;

        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subscriptionId);

          // 監査ログ記録
          await logAuditEventServer({
            event_type: event.type,
            target_table: 'subscriptions',
            target_id: subscriptionId,
            description: 'サブスクリプション支払い失敗',
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handling error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
