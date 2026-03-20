import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: admin } = await supabase
    .from("admins")
    .select("subscription_status")
    .eq("user_id", user.id)
    .single();

  const allowedStatuses = ["active", "trialing"];
  if (!admin || !allowedStatuses.includes(admin.subscription_status)) {
    redirect("/pagamento-pendente");
  }

  return <div className="min-h-screen bg-background">{children}</div>;
}
