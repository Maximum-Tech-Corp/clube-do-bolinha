import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerDataSection } from '../player-data-section';

const mockClearPlayerCookie = vi.fn().mockResolvedValue(undefined);

vi.mock('@/actions/player', () => ({
  clearPlayerCookie: (...args: unknown[]) => mockClearPlayerCookie(...args),
}));

const BASE_PLAYER = {
  name: 'João Silva',
  phone: '(11) 99999-9999',
  weight_kg: 75,
  stamina: '3',
  is_star: false,
};

describe('PlayerDataSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders player name', () => {
    render(
      <PlayerDataSection
        player={BASE_PLAYER}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders player phone', () => {
    render(
      <PlayerDataSection
        player={BASE_PLAYER}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument();
  });

  it('renders player weight', () => {
    render(
      <PlayerDataSection
        player={BASE_PLAYER}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.getByText('75 kg')).toBeInTheDocument();
  });

  it("renders stamina label for '3'", () => {
    render(
      <PlayerDataSection
        player={BASE_PLAYER}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.getByText('3 jogos')).toBeInTheDocument();
  });

  it("renders stamina label for '1'", () => {
    render(
      <PlayerDataSection
        player={{ ...BASE_PLAYER, stamina: '1' }}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.getByText('1 jogo')).toBeInTheDocument();
  });

  it("renders stamina label for '4plus'", () => {
    render(
      <PlayerDataSection
        player={{ ...BASE_PLAYER, stamina: '4plus' }}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.getByText('4 ou mais jogos')).toBeInTheDocument();
  });

  it('does not show star classification when is_star is false', () => {
    render(
      <PlayerDataSection
        player={BASE_PLAYER}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.queryByText(/Estrela/)).not.toBeInTheDocument();
  });

  it('shows star classification when is_star is true', () => {
    render(
      <PlayerDataSection
        player={{ ...BASE_PLAYER, is_star: true }}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.getByText(/Estrela/)).toBeInTheDocument();
  });

  it("renders 'Sair e entrar como outro Jogador' button", () => {
    render(
      <PlayerDataSection
        player={BASE_PLAYER}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(
      screen.getByRole('button', { name: /Sair e entrar como outro Jogador/ }),
    ).toBeInTheDocument();
  });

  it("clicking 'Sair e entrar como outro Jogador' calls clearPlayerCookie with teamId", async () => {
    const user = userEvent.setup();
    render(
      <PlayerDataSection
        player={BASE_PLAYER}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );

    await user.click(
      screen.getByRole('button', { name: /Sair e entrar como outro Jogador/ }),
    );

    expect(mockClearPlayerCookie).toHaveBeenCalledWith('team-1');
  });

  it("renders section title 'Meus dados'", () => {
    render(
      <PlayerDataSection
        player={BASE_PLAYER}
        teamId="team-1"
        teamCode="CODE-1"
      />,
    );
    expect(screen.getByText('Meus dados')).toBeInTheDocument();
  });
});
