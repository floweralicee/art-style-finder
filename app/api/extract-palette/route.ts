export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { extractPaletteFromImageUrl } from '@/lib/extract-palette-server';
import { getPostHogClient } from '@/lib/posthog-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';

    if (!imageUrl) {
      return NextResponse.json({ colors: null });
    }

    const colors = await extractPaletteFromImageUrl(imageUrl);

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: 'server',
      event: 'palette_extracted',
      properties: {
        success: colors !== null,
        colors_found: colors?.length ?? 0,
      },
    });

    return NextResponse.json({ colors });
  } catch {
    return NextResponse.json({ colors: null });
  }
}
