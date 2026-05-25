export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { extractPaletteFromBuffer } from '@/lib/extract-palette-server';
import {
  gatherPaletteMatchCandidates,
  rankArtworksByPaletteDistance,
} from '@/lib/museum-search';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image');

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: 'image file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const imageColors = await extractPaletteFromBuffer(buffer);

    if (!imageColors || imageColors.length === 0) {
      return NextResponse.json({ error: 'Could not extract palette from image' }, { status: 422 });
    }

    const candidates = await gatherPaletteMatchCandidates();
    const artworks = await rankArtworksByPaletteDistance(candidates, imageColors, 20);

    return NextResponse.json({
      artworks,
      imageColors,
      weakMatch: artworks.length < 5,
    });
  } catch {
    return NextResponse.json({ error: 'Image match failed' }, { status: 500 });
  }
}
