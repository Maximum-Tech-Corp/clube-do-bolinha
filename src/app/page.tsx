import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/app-logo";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/40">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center">
          <AppLogo size="lg" />
          <p className="mt-3 text-muted-foreground text-sm">
            Organize suas peladas semanais
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/jogador">
            <Button className="w-full" size="lg">
              Sou jogador
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="w-full" size="lg">
              Sou organizador
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
