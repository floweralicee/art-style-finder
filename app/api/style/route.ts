import { NextRequest, NextResponse } from 'next/server';
import { MUSEUM_PALETTES, MOVEMENTS, DESIGN_RECS } from '@/lib/museums';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const museum = searchParams.get('museum') || 'met';

  const palette = MUSEUM_PALETTES[museum] || MUSEUM_PALETTES['met'];
  const movements = MOVEMENTS[museum] || MOVEMENTS['met'];
  const recommendations = DESIGN_RECS[museum] || DESIGN_RECS['met'];

  return NextResponse.json({
    palette,
    movements,
    recommendations,
  });
}
