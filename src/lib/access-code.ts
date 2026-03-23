const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomSegment(length: number): string {
  return Array.from(
    { length },
    () => CHARS[Math.floor(Math.random() * CHARS.length)],
  ).join('');
}

/** Gera um código de acesso no formato XXXX-XXXXXX (prefixo editável + sufixo fixo) */
export function generateAccessCode() {
  const prefix = randomSegment(4);
  const suffix = randomSegment(6);
  return { prefix, suffix, full: `${prefix}-${suffix}` };
}
