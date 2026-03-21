"use client";

export function ShareAppLink() {
  function handleShare() {
    const url = window.location.origin;
    const text = encodeURIComponent(
      `*Clube do Bolinha*\nOrganize o futebol da sua turma de forma simples!\n\n- Confirme presenca nos jogos\n- Veja os times sorteados\n- Acompanhe rankings e historico\n\nAcesse: ${url}\n\n*Para instalar como app:*\nAndroid: abra no Chrome, toque nos 3 pontos e selecione "Adicionar a tela inicial"\niPhone: abra no Safari, toque em Compartilhar e selecione "Adicionar a Tela de Inicio"`
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
