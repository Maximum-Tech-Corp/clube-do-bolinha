import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { mockSupabaseFrom, createQueryMock } from '@/test/mocks/supabase';

// ─── Stripe mock ──────────────────────────────────────────────────────────────

const mockConstructEvent = vi.fn();

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  })),
}));

const { POST } = await import('@/app/api/webhooks/stripe/route');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: string, signature: string | null = 'sig_test') {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (signature !== null) headers['stripe-signature'] = signature;
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body,
  });
}

function makeEvent(type: string, object: Record<string, unknown>): unknown {
  return { type, data: { object } };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = makeRequest('{}', null);
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/missing signature/i);
  });

  it('returns 400 when signature is invalid (constructEvent throws)', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });
    const req = makeRequest('{}', 'bad_sig');
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid signature/i);
  });

  it('handles checkout.session.completed → sets subscription active', async () => {
    const event = makeEvent('checkout.session.completed', {
      metadata: { admin_id: 'admin-uuid' },
      customer: 'cus_123',
      subscription: 'sub_123',
    });
    mockConstructEvent.mockReturnValue(event);
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const req = makeRequest('{}', 'sig_valid');
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('admins');
  });

  it('skips DB update when checkout.session.completed has no admin_id in metadata', async () => {
    const event = makeEvent('checkout.session.completed', {
      metadata: {},
      customer: 'cus_123',
      subscription: 'sub_123',
    });
    mockConstructEvent.mockReturnValue(event);

    const req = makeRequest('{}', 'sig_valid');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('handles invoice.payment_failed → sets subscription inactive', async () => {
    const event = makeEvent('invoice.payment_failed', {
      customer: 'cus_456',
    });
    mockConstructEvent.mockReturnValue(event);
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const req = makeRequest('{}', 'sig_valid');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('admins');
  });

  it('handles customer.subscription.deleted → sets subscription inactive', async () => {
    const event = makeEvent('customer.subscription.deleted', {
      customer: 'cus_789',
    });
    mockConstructEvent.mockReturnValue(event);
    mockSupabaseFrom.mockReturnValueOnce(
      createQueryMock({ data: null, error: null }),
    );

    const req = makeRequest('{}', 'sig_valid');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('admins');
  });

  it('returns 200 for unknown event types without DB side effects', async () => {
    const event = makeEvent('unknown.event.type', { id: 'ev_unknown' });
    mockConstructEvent.mockReturnValue(event);

    const req = makeRequest('{}', 'sig_valid');
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });
});
