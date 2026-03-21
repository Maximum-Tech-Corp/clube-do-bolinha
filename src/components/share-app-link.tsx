"use client";

export function ShareAppLink() {
  function handleShare() {
    const url = window.location.origin;
    const text = encodeURIComponent(
      `⚽ *Clube do Bolinha* — Organize o futebol da sua turma!\n\nConfirme presença, veja os times sorteados e acompanhe rankings.\n\n👉 Acesse: ${url}\n\n📱 *Instale como app no celular:*\n• *Android:* Chrome → menu ⋮ → "Adicionar à tela inicial"\n• *iPhone:* Safari → botão ↑ compartilhar → "Adicionar à Tela de Início"`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
    >
      Compartilhar com amigos
    </button>
  );
}
