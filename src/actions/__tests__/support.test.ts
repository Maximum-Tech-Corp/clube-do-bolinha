import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  mockSupabaseAuth,
  mockSupabaseFrom,
  createQueryMock,
} from '@/test/mocks/supabase';

// Mock Resend before importing the action
const mockResendSend = vi.fn();
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockResendSend },
  })),
}));

const { sendSupportEmail } = await import('@/actions/support');

describe('sendSupportEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-uuid', email: 'admin@example.com' },
      },
      error: null,
    });
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({
        data: { name: 'João', phone: '11999999999' },
        error: null,
      }),
    );
    mockResendSend.mockResolvedValue({ data: {}, error: null });
  });

  it('returns { success: true } when email is sent', async () => {
    const result = await sendSupportEmail({
      type: 'bug',
      message: 'App travou',
    });
    expect(result).toEqual({ success: true });
  });

  it('returns { error } when user is not authenticated', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await sendSupportEmail({
      type: 'bug',
      message: 'Algo errado',
    });

    expect(result).toEqual({ error: 'Sessão inválida.' });
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it('returns { error } when Resend fails', async () => {
    mockResendSend.mockResolvedValue({
      data: null,
      error: { message: 'API error' },
    });

    const result = await sendSupportEmail({
      type: 'suggestion',
      message: 'Minha sugestão',
    });

    expect(result).toEqual({
      error: 'Não foi possível enviar. Tente novamente.',
    });
  });

  it('subject contains "Bug Report" when type is bug', async () => {
    await sendSupportEmail({ type: 'bug', message: 'Erro na tela' });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Bug Report'),
      }),
    );
  });

  it('subject contains "Sugestão" when type is suggestion', async () => {
    await sendSupportEmail({ type: 'suggestion', message: 'Adicione X' });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('Sugestão') }),
    );
  });

  it('subject contains "Reclamação" when type is complaint', async () => {
    await sendSupportEmail({
      type: 'complaint',
      message: 'Insatisfeito com X',
    });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining('Reclamação'),
      }),
    );
  });

  it('subject contains "Ajuda" when type is help', async () => {
    await sendSupportEmail({ type: 'help', message: 'Como faço X?' });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('Ajuda') }),
    );
  });

  it('sends email with admin email as replyTo', async () => {
    await sendSupportEmail({ type: 'bug', message: 'Erro' });

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'admin@example.com' }),
    );
  });
});
