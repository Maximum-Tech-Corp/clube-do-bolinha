import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: 192,
        height: 192,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#3d8b55',
        borderRadius: 40,
      }}
    >
      <div style={{ fontSize: 110 }}>⚽</div>
    </div>,
    { width: 192, height: 192 },
  );
}
