"use server";

import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function createCheckoutSession() {
  const stripe = getStripe();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("id, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!admin) redirect("/login");

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pagamento-pendente`,
    metadata: { admin_id: admin.id },
  };

  // Reutiliza o customer do Stripe se já existir
  if (admin.stripe_customer_id) {
    params.customer = admin.stripe_customer_id;
  } else {
    params.customer_email = user.email ?? undefined;
  }

  const session = await stripe.checkout.sessions.create(params);

  redirect(session.url!);
}
