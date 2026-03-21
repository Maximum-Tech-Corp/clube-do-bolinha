import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/app-logo";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 p-6 bg-muted/40">
      <div className="w-full max-w-sm space-y-12">
        <div className="text-center">
          <AppLogo size="lg" />
          <p className="mt-3 text-muted-foreground text-sm">
            Organize o futebol da sua turma
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
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
