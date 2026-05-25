import { Artwork } from '@/lib/types';
import { MUSEUM_PALETTES } from '@/lib/museums';
import { extractPaletteFromImageUrl } from '@/lib/extract-palette-server';
import { deriveDesignRec, hexToHsl } from '@/lib/palette-utils';
import type { MoodProfile } from '@/lib/moodKeywords';

const MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1';
const RIJKS_API = 'https://www.rijksmuseum.nl/api/en/collection';
const CHICAGO_API = 'https://api.artic.edu/api/v1/artworks';

const BROAD_SEARCH_KEYWORDS = ['painting', 'portrait', 'landscape', 'figure', 'colour'];

async function fetchMetByKeyword(keyword: string, limit = 8): Promise<Artwork[]> {
  try {
    const searchRes = await fetch(
      `${MET_API}/search?hasImages=true&q=${encodeURIComponent(keyword)}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    if (!searchData.objectIDs?.length) return [];

    const ids = (searchData.objectIDs as number[]).slice(0, limit);
    const objects = await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`${MET_API}/objects/${id}`, { next: { revalidate: 3600 } });
          if (!res.ok) return null;
          return res.json();
        } catch {
          return null;
        }
      })
    );

    return objects
      .filter((obj): obj is Record<string, unknown> => {
        if (!obj) return false;
        const img = (obj.primaryImageSmall as string) || (obj.primaryImage as string);
        return !!img;
      })
      .map((obj) => ({
        id: `met-${obj.objectID}`,
        title: (obj.title as string) || 'Untitled',
        artist: (obj.artistDisplayName as string) || 'Unknown Artist',
        year: (obj.objectDate as string) || '',
        medium: (obj.medium as string) || '',
        image: (obj.primaryImageSmall as string) || (obj.primaryImage as string) || '',
        museum: 'met' as const,
        tags: ((obj.tags as Array<{ term: string }>) || []).map((t) => t.term).slice(0, 3),
      }));
  } catch {
    return [];
  }
}

async function fetchRijksByKeyword(keyword: string, limit = 8): Promise<Artwork[]> {
  try {
    const res = await fetch(
      `${RIJKS_API}?key=0fiHOPkl&imgonly=True&ps=${limit}&p=1&q=${encodeURIComponent(keyword)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.artObjects || [])
      .filter((obj: Record<string, unknown>) => !!(obj.webImage as Record<string, string>)?.url)
      .map((obj: Record<string, unknown>) => ({
        id: `rijks-${obj.objectNumber}`,
        title: (obj.title as string) || 'Untitled',
        artist: (obj.principalOrFirstMaker as string) || 'Unknown Artist',
        year: (obj.longTitle as string)?.match(/\d{4}/)?.[0] || '',
        medium: '',
        image: (obj.webImage as Record<string, string>)?.url || '',
        museum: 'rijks' as const,
        tags: [],
      }));
  } catch {
    return [];
  }
}

async function fetchChicagoByKeyword(keyword: string, limit = 8): Promise<Artwork[]> {
  try {
    const params = `fields=id,title,artist_title,date_display,medium_display,image_id,term_titles&limit=${limit}&q=${encodeURIComponent(keyword)}`;
    const res = await fetch(`${CHICAGO_API}?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const iiifUrl = data.config?.iiif_url || 'https://www.artic.edu/iiif/2';

    return (data.data || [])
      .filter((obj: Record<string, unknown>) => !!obj.image_id)
      .map((obj: Record<string, unknown>) => ({
        id: `chicago-${obj.id}`,
        title: (obj.title as string) || 'Untitled',
        artist: (obj.artist_title as string) || 'Unknown Artist',
        year: (obj.date_display as string) || '',
        medium: (obj.medium_display as string) || '',
        image: `${iiifUrl}/${obj.image_id}/full/843,/0/default.jpg`,
        museum: 'chicago' as const,
        tags: ((obj.term_titles as string[]) || []).slice(0, 3),
      }));
  } catch {
    return [];
  }
}

export async function searchMuseumsByKeywords(
  keywords: string[],
  perKeywordLimit = 8
): Promise<Artwork[]> {
  const uniqueKeywords = [...new Set(keywords.filter(Boolean))].slice(0, 5);
  if (uniqueKeywords.length === 0) return [];

  const batches = await Promise.all(
    uniqueKeywords.flatMap((keyword) => [
      fetchMetByKeyword(keyword, perKeywordLimit),
      fetchRijksByKeyword(keyword, perKeywordLimit),
      fetchChicagoByKeyword(keyword, perKeywordLimit),
    ])
  );

  const byId = new Map<string, Artwork>();
  for (const batch of batches) {
    for (const artwork of batch) {
      if (artwork.image) byId.set(artwork.id, artwork);
    }
  }

  return [...byId.values()];
}

export async function gatherPaletteMatchCandidates(keywords?: string[]): Promise<Artwork[]> {
  const searchTerms = keywords?.length ? keywords : BROAD_SEARCH_KEYWORDS;
  return searchMuseumsByKeywords(searchTerms, 10);
}

function rgbDistance(a: string, b: string): number {
  const parse = (hex: string) => {
    const value = hex.replace('#', '');
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16),
    ];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export function paletteRgbDistance(artworkColors: string[], targetColors: string[]): number {
  const artwork = artworkColors.slice(0, 5);
  const target = targetColors.slice(0, 5);
  if (artwork.length === 0 || target.length === 0) return Infinity;

  let total = 0;
  for (const color of artwork) {
    let min = Infinity;
    for (const targetColor of target) {
      min = Math.min(min, rgbDistance(color, targetColor));
    }
    total += min;
  }

  return total / artwork.length;
}

function classifyTemperature(hue: number, saturation: number): 'warm' | 'cool' | 'neutral' {
  if (saturation < 0.15) return 'neutral';
  if ((hue >= 0 && hue <= 60) || hue >= 300) return 'warm';
  if (hue >= 180 && hue <= 270) return 'cool';
  return 'neutral';
}

function averagePaletteTraits(colors: string[]) {
  const hslValues = colors.map(hexToHsl);
  const avgHue = hslValues.reduce((sum, [h]) => sum + h, 0) / hslValues.length;
  const avgSat = hslValues.reduce((sum, [, s]) => sum + s, 0) / hslValues.length;
  const avgLight = hslValues.reduce((sum, [, , l]) => sum + l, 0) / hslValues.length;
  return {
    temperature: classifyTemperature(avgHue, avgSat),
    saturation: avgSat > 0.5 ? 'vivid' as const : avgSat < 0.3 ? 'muted' as const : 'balanced' as const,
    lightness: avgLight > 0.6 ? 'light' as const : avgLight < 0.4 ? 'dark' as const : 'balanced' as const,
  };
}

export function scoreMoodPaletteMatch(colors: string[], profile: MoodProfile): number {
  const traits = averagePaletteTraits(colors);
  let score = 100;

  if (profile.temperature !== 'neutral' && traits.temperature !== profile.temperature) {
    score -= traits.temperature === 'neutral' ? 20 : 35;
  }
  if (profile.saturation !== 'balanced' && traits.saturation !== profile.saturation) {
    score -= 25;
  }
  if (profile.lightness !== 'balanced' && traits.lightness !== profile.lightness) {
    score -= 25;
  }

  return Math.max(0, score);
}

async function resolveArtworkPalette(artwork: Artwork): Promise<string[]> {
  const extracted = await extractPaletteFromImageUrl(artwork.image);
  return extracted ?? MUSEUM_PALETTES[artwork.museum] ?? MUSEUM_PALETTES.met;
}

export async function rankArtworksByPaletteDistance(
  artworks: Artwork[],
  targetColors: string[],
  limit = 20
): Promise<Artwork[]> {
  if (artworks.length === 0 || targetColors.length === 0) return [];

  const presetScores = artworks.map((artwork) => ({
    artwork,
    distance: paletteRgbDistance(
      MUSEUM_PALETTES[artwork.museum] ?? MUSEUM_PALETTES.met,
      targetColors
    ),
  }));

  presetScores.sort((a, b) => a.distance - b.distance);
  const shortlist = presetScores.slice(0, Math.min(40, presetScores.length));

  const scored = await Promise.all(
    shortlist.map(async ({ artwork }) => {
      const palette = await resolveArtworkPalette(artwork);
      return {
        artwork,
        distance: paletteRgbDistance(palette, targetColors),
      };
    })
  );

  scored.sort((a, b) => a.distance - b.distance);
  return scored.slice(0, limit).map((entry) => entry.artwork);
}

export async function rankArtworksByMood(
  artworks: Artwork[],
  profile: MoodProfile,
  limit = 20
): Promise<Artwork[]> {
  if (artworks.length === 0) return [];

  const presetScores = artworks.map((artwork) => ({
    artwork,
    score: scoreMoodPaletteMatch(MUSEUM_PALETTES[artwork.museum] ?? MUSEUM_PALETTES.met, profile),
  }));

  presetScores.sort((a, b) => b.score - a.score);
  const shortlist = presetScores.slice(0, Math.min(40, presetScores.length));

  const scored = await Promise.all(
    shortlist.map(async ({ artwork }) => {
      const palette = await resolveArtworkPalette(artwork);
      return {
        artwork,
        score: scoreMoodPaletteMatch(palette, profile),
      };
    })
  );

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.artwork);
}

export function paletteSuggestion(colors: string[]): string {
  const rec = deriveDesignRec(colors);
  return `${rec.h} — ${rec.b}`;
}
