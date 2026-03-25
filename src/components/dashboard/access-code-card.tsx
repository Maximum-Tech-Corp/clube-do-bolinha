'use client';

import { useState } from 'react';
import { updateAccessCodePrefix } from '@/actions/team';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  teamName: string;
  accessCode: string;
  appUrl: string;
}

export function AccessCodeCard({ teamName, accessCode, appUrl }: Props) {
  const [editing, setEditing] = useState(false);
  const [prefix, setPrefix] = useState(accessCode.split('-')[0]);
  const [currentCode, setCurrentCode] = useState(accessCode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopyCode() {
    navigator.clipboard.writeText(currentCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const suffix = currentCode.split('-')[1];

  const whatsappText = encodeURIComponent(
    `Ola! Acesse a turma *${teamName}* no Clube do Bolinha.

Codigo de acesso: *${currentCode}*
Link: ${appUrl}/jogador

*Para instalar como app:*
Android: abra no Chrome, toque nos 3 pontos e selecione "Adicionar a tela inicial"
iPhone: abra no Safari, toque em Compartilhar e selecione "Adicionar a Tela de Inicio"`,
  );

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateAccessCodePrefix(prefix);
    if (result.error) {
      setError(result.error);
    } else {
      setCurrentCode(`${prefix}-${suffix}`);
      setEditing(false);
    }
    setSaving(false);
  }

  function handleCancel() {
    setPrefix(currentCode.split('-')[0]);
    setError(null);
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold text-base">Código de acesso</p>
        <p className="text-sm text-muted-foreground">
          Compartilhe com os jogadores o código de confirmação de presença nos
          jogos da turma
        </p>
      </div>

      {!editing ? (
        <>
          <button
            type="button"
            onClick={handleCopyCode}
            className="w-full font-mono text-2xl font-bold tracking-widest text-center py-3 bg-primary/5 rounded-md border border-gray-300 hover:bg-primary/10 transition-colors cursor-pointer relative"
            title="Clique para copiar"
          >
            {currentCode}
            {copied && (
              <span className="absolute inset-0 flex items-center justify-center rounded-md bg-muted text-sm font-sans font-medium tracking-normal text-primary">
                Copiado!
              </span>
            )}
          </button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 py-5 border-primary text-primary hover:bg-primary/5 hover:text-primary cursor-pointer"
              onClick={() => setEditing(true)}
            >
              Editar prefixo
            </Button>
            <a
              href={`https://wa.me/?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full py-5 cursor-pointer flex items-center gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 shrink-0"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Compartilhar código
              </Button>
            </a>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-2">
            <Input
              value={prefix}
              onChange={e =>
                setPrefix(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 4),
                )
              }
              className="font-mono text-center w-24"
              maxLength={4}
              placeholder="XXXX"
            />
            <span className="font-mono text-xl font-bold">-</span>
            <span className="font-mono text-lg font-bold text-muted-foreground">
              {suffix}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Apenas o prefixo (4 caracteres) pode ser alterado. O sufixo é
            permanente.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 py-5 border-primary text-primary hover:bg-primary/5 hover:text-primary"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 py-5"
              onClick={handleSave}
              disabled={saving || prefix.length !== 4}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
