'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Share2, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateTeamSettings } from '@/actions/team';

interface Props {
  appUrl: string;
  teamName: string;
  matchDurationMinutes: number;
}

export function DashboardMenu({
  appUrl,
  teamName,
  matchDurationMinutes,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [name, setName] = useState(teamName);
  const [duration, setDuration] = useState(String(matchDurationMinutes));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shareText = encodeURIComponent(
    `*Clube do Bolinha*
Organize o futebol da sua turma de forma simples!

- Confirme presenca nos jogos
- Veja os times sorteados
- Acompanhe rankings e historico

Acesse: ${appUrl}

*Para instalar como app:*
Android: abra no Chrome, toque nos 3 pontos e selecione "Adicionar a tela inicial"
iPhone: abra no Safari, toque em Compartilhar e selecione "Adicionar a Tela de Inicio"`,
  );

  async function handleSave() {
    const val = parseInt(duration, 10);
    if (isNaN(val) || val < 1 || !name.trim()) return;
    setSaving(true);
    await updateTeamSettings({ matchDurationMinutes: val, teamName: name });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(o => !o)}
        className="p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Menu"
      >
        <MoreVertical className="w-5 h-5 text-muted-foreground" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-10 z-50 min-w-45 rounded-lg border border-border bg-card shadow-lg py-1">
          <a
            href={`https://wa.me/?text=${shareText}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
            Compartilhar
          </a>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setSettingsOpen(true);
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
            Configurações
          </button>
        </div>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações da turma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome da turma</Label>
              <Input
                id="team-name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Tempo das partidas (minutos)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                value={duration}
                onChange={e => setDuration(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Atualizar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
