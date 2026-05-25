import { Vibrant } from 'node-vibrant/node';
import type { Palette } from '@vibrant/color';

const SWATCH_KEYS: (keyof Palette)[] = [
  'Vibrant',
  'Muted',
  'DarkVibrant',
  'LightVibrant',
  'DarkMuted',
];

const FETCH_HEADERS = {
  'User-Agent': 'ArtStyleFinder/1.0',
};

export function mapPaletteToColors(palette: Palette): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();

  for (const key of SWATCH_KEYS) {
    const swatch = palette[key];
    if (swatch?.hex && !seen.has(swatch.hex.toLowerCase())) {
      colors.push(swatch.hex.toUpperCase());
      seen.add(swatch.hex.toLowerCase());
    }
  }

  if (colors.length < 5) {
    for (const swatch of Object.values(palette)) {
      if (colors.length >= 5) break;
      if (swatch?.hex && !seen.has(swatch.hex.toLowerCase())) {
        colors.push(swatch.hex.toUpperCase());
        seen.add(swatch.hex.toLowerCase());
      }
    }
  }

  return colors.slice(0, 5);
}

export async function extractPaletteFromBuffer(buffer: Buffer): Promise<string[] | null> {
  try {
    const palette = await Vibrant.from(buffer).getPalette();
    const colors = mapPaletteToColors(palette);
    return colors.length > 0 ? colors : null;
  } catch {
    return null;
  }
}

export async function extractPaletteFromImageUrl(imageUrl: string): Promise<string[] | null> {
  try {
    const response = await fetch(imageUrl, { headers: FETCH_HEADERS });
    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return extractPaletteFromBuffer(buffer);
  } catch {
    return null;
  }
}
