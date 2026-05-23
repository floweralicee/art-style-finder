import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { loadFrauncesBold } from '@/lib/og-font';

export const alt = 'Artchive — Museum masterpieces into your brand\'s design language';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const [previewBuffer, frauncesBold] = await Promise.all([
    readFile(join(process.cwd(), 'public/preview.png')),
    loadFrauncesBold(),
  ]);

  const previewSrc = `data:image/png;base64,${previewBuffer.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#f9f8f5',
        }}
      >
        <img
          src={previewSrc}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '50% 50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              display: 'flex',
              fontFamily: 'Fraunces',
              fontSize: 168,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#1a1a1a',
              lineHeight: 1,
              textShadow:
                '0 1px 18px rgba(249, 248, 245, 0.75), 0 0 1px rgba(249, 248, 245, 0.8)',
            }}
          >
            Artchive.
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Fraunces',
          data: frauncesBold,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  );
}
