export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { translateMoodToKeywords, inferMoodProfile } from '@/lib/moodKeywords';
import { searchMuseumsByKeywords, rankArtworksByMood } from '@/lib/museum-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const type = body.type === 'text' ? 'text' : null;
    const input = typeof body.input === 'string' ? body.input.trim() : '';

    if (type !== 'text') {
      return NextResponse.json({ error: 'type must be "text"' }, { status: 400 });
    }
    if (!input) {
      return NextResponse.json({ error: 'input is required' }, { status: 400 });
    }

    const keywords = translateMoodToKeywords(input);
    const moodProfile = inferMoodProfile(input);
    const candidates = await searchMuseumsByKeywords(keywords);
    const artworks = await rankArtworksByMood(candidates, moodProfile, 20);

    return NextResponse.json({
      artworks,
      weakMatch: artworks.length < 5,
    });
  } catch {
    return NextResponse.json({ error: 'Creative search failed' }, { status: 500 });
  }
}
