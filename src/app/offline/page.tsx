export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
      <div className="text-5xl">⚽</div>
      <h1 className="text-xl font-bold">Sem conexão</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        Você está offline. Verifique sua internet e tente novamente.
      </p>
    </div>
  );
}
