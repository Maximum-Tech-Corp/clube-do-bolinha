"use client";

import { useState } from "react";
import { updateAccessCodePrefix } from "@/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  teamName: string;
  accessCode: string;
  appUrl: string;
}

export function AccessCodeCard({ teamName, accessCode, appUrl }: Props) {
  const [editing, setEditing] = useState(false);
  const [prefix, setPrefix] = useState(accessCode.split("-")[0]);
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

  const suffix = currentCode.split("-")[1];

  const whatsappText = encodeURIComponent(
    `Olá! Use o código *${currentCode}* para acessar a turma *${teamName}* no Clube do Bolinha.\n\nAcesse: ${appUrl}/jogador`
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
    setPrefix(currentCode.split("-")[0]);
    setError(null);
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Código de acesso</CardTitle>
        <CardDescription>
          Compartilhe com os jogadores para que entrem na turma
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing ? (
          <>
            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full font-mono text-2xl font-bold tracking-widest text-center py-3 bg-muted rounded-md hover:bg-muted/70 transition-colors cursor-pointer relative"
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
                size="sm"
                className="flex-1"
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
                <Button
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Compartilhar no WhatsApp
                </Button>
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              <Input
                value={prefix}
                onChange={(e) =>
                  setPrefix(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 4)
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
                size="sm"
                className="flex-1"
                onClick={handleCancel}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSave}
                disabled={saving || prefix.length !== 4}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
