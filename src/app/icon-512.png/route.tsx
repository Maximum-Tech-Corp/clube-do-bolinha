import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    <div
      style={{
        width: 512,
        height: 512,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#3d8b55',
        borderRadius: 100,
      }}
    >
      <div style={{ fontSize: 300 }}>⚽</div>
    </div>,
    { width: 512, height: 512 },
  );
}
