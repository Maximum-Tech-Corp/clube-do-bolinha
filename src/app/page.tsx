import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-muted/40">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Clube do Bolinha
          </h1>
          <p className="text-muted-foreground">
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
