import { AppLogo } from "@/components/app-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-16 bg-muted/40 p-4 gap-6">
      <AppLogo size="md" />
      {children}
    </div>
  );
}
