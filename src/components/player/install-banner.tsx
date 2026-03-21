"use client";

import { useEffect, useState } from "react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function InstallBanner() {
  const [platform, setPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    if (isStandalone()) return; // já instalado
    setPlatform(detectPlatform());
  }, []);

  if (!platform || platform === "other") return null;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
      <p className="font-medium text-primary">
        {platform === "ios" ? "📲 Instale no iPhone" : "📲 Instale no celular"}
      </p>
      {platform === "ios" ? (
        <p className="text-muted-foreground">
          Abra esta página no <strong>Safari</strong>, toque no botão{" "}
          <strong>compartilhar ↑</strong> e escolha{" "}
          <strong>"Adicionar à Tela de Início"</strong> para usar como app.
        </p>
      ) : (
        <p className="text-muted-foreground">
          Toque no <strong>menu do Chrome ⋮</strong> e escolha{" "}
          <strong>"Adicionar à tela inicial"</strong> para instalar o app
          diretamente no celular.
        </p>
      )}
    </div>
  );
}
