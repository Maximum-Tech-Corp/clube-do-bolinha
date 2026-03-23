import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

interface Props {
  searchParams: Promise<{ session_id?: string }>;
}

export default async function CheckoutSucessoPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  if (!session_id) redirect('/pagamento-pendente');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const session = await stripe.checkout.sessions.retrieve(session_id);

  if (session.payment_status !== 'paid') {
    redirect('/pagamento-pendente');
  }

  const adminId = session.metadata?.admin_id;
  if (!adminId) redirect('/pagamento-pendente');

  // Garante que o banco está atualizado mesmo que o webhook ainda não tenha processado
  const service = createServiceClient();
  await service
    .from('admins')
    .update({
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_status: 'active',
    })
    .eq('id', adminId);

  redirect('/dashboard');
}
