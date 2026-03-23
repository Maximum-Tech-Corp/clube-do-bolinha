import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const service = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const adminId = session.metadata?.admin_id;
      if (!adminId) break;

      await service
        .from('admins')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
        })
        .eq('id', adminId);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await service
        .from('admins')
        .update({ subscription_status: 'inactive' })
        .eq('stripe_customer_id', invoice.customer as string);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await service
        .from('admins')
        .update({ subscription_status: 'inactive' })
        .eq('stripe_customer_id', subscription.customer as string);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
