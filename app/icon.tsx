import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default async function Icon() {
  const svg = await readFile(join(process.cwd(), 'app/icon.svg'), 'utf8');
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F9F8F5',
        }}
      >
        <img src={src} width={32} height={32} alt="" />
      </div>
    ),
    { ...size }
  );
}
