export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { extractPaletteFromImageUrl } from '@/lib/extract-palette-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';

    if (!imageUrl) {
      return NextResponse.json({ colors: null });
    }

    const colors = await extractPaletteFromImageUrl(imageUrl);
    return NextResponse.json({ colors });
  } catch {
    return NextResponse.json({ colors: null });
  }
}
