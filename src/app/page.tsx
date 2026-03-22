import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/app-logo";
import { ShareAppLink } from "@/components/share-app-link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-24 p-6 pb-28 bg-muted/40">
      <div className="w-full max-w-sm space-y-12">
        <div className="text-center">
          <AppLogo size="lg" />
          <p className="mt-3 text-muted-foreground text-sm">
            Organize o futebol da sua turma
          </p>
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <Link href="/jogador" className="w-full">
            <Button className="w-full" size="lg">
              Sou jogador
            </Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full" size="lg">
              Sou organizador
            </Button>
          </Link>
          <ShareAppLink />
        </div>
      </div>

      {/* Rodapé fixo Maximum Tech */}
      <footer className="fixed bottom-0 left-0 right-0 flex flex-col items-center justify-center gap-1 py-3 bg-muted/40 backdrop-blur-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://raw.githubusercontent.com/diegoMasin/landing-maximumtech/master/assets/img/new-logo-mt-01.png"
          alt="Maximum Tech"
          width={400}
          height={101}
          className="h-5 w-auto opacity-60"
        />
        <span className="text-[10px] text-muted-foreground/60">v1.0.0 Beta</span>
      </footer>
    </div>
  );
}
