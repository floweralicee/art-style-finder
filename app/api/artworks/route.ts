import { NextRequest, NextResponse } from 'next/server';
import { Artwork } from '@/lib/types';

const MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1';
const RIJKS_API = 'https://www.rijksmuseum.nl/api/en/collection';
const CHICAGO_API = 'https://api.artic.edu/api/v1/artworks';

function classificationMatchesFilter(classification: string, filter: string): boolean {
  const cl = classification.toLowerCase();
  switch (filter) {
    case 'painting': return cl.includes('paint');
    case 'photography': return cl.includes('photo');
    case 'drawing': return cl.includes('draw');
    case 'print': return cl.includes('print');
    case 'sculpture': return cl.includes('sculpt');
    default: return true;
  }
}

async function fetchMet(filter: string, page: number): Promise<Artwork[]> {
  try {
    const searchQuery = filter === 'all' ? 'art' : filter;
    const searchRes = await fetch(
      `${MET_API}/search?hasImages=true&q=${searchQuery}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    if (!searchData.objectIDs || searchData.objectIDs.length === 0) return [];

    const batchSize = 15;
    const startIdx = page * batchSize;
    const ids = searchData.objectIDs.slice(startIdx, startIdx + batchSize);

    const objects = await Promise.all(
      ids.map(async (id: number) => {
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
        const img = obj.primaryImageSmall as string || obj.primaryImage as string;
        if (!img) return false;
        if (filter !== 'all') {
          const classification = (obj.classification as string) || (obj.objectName as string) || '';
          if (!classificationMatchesFilter(classification, filter)) return false;
        }
        return true;
      })
      .slice(0, 10)
      .map((obj) => ({
        id: `met-${obj.objectID}`,
        title: (obj.title as string) || 'Untitled',
        artist: (obj.artistDisplayName as string) || 'Unknown Artist',
        year: (obj.objectDate as string) || '',
        medium: (obj.medium as string) || '',
        image: (obj.primaryImageSmall as string) || (obj.primaryImage as string) || '',
        museum: 'met' as const,
        tags: ((obj.tags as Array<{term: string}>) || []).map(t => t.term).slice(0, 3),
      }));
  } catch {
    return [];
  }
}

async function fetchRijks(filter: string, page: number): Promise<Artwork[]> {
  try {
    let typeParam = '';
    if (filter !== 'all') {
      typeParam = `&type=${filter}`;
    }
    const res = await fetch(
      `${RIJKS_API}?key=0fiHOPkl&imgonly=True&ps=10&p=${page + 1}${typeParam}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.artObjects || [])
      .filter((obj: Record<string, unknown>) => {
        const img = (obj.webImage as Record<string, string>)?.url;
        return !!img;
      })
      .slice(0, 10)
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

async function fetchChicago(filter: string, page: number): Promise<Artwork[]> {
  try {
    let params = `fields=id,title,artist_title,date_display,medium_display,image_id,classification_title,term_titles&limit=15&page=${page + 1}`;
    if (filter !== 'all') {
      params += `&q=${filter}`;
    }
    const res = await fetch(`${CHICAGO_API}?${params}`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const config = data.config;
    const iiifUrl = config?.iiif_url || 'https://www.artic.edu/iiif/2';

    return (data.data || [])
      .filter((obj: Record<string, unknown>) => {
        if (!obj.image_id) return false;
        if (filter !== 'all') {
          const cl = ((obj.classification_title as string) || '').toLowerCase();
          if (!classificationMatchesFilter(cl, filter)) return true; // Chicago uses q param
        }
        return true;
      })
      .slice(0, 10)
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') || 'all';
  const page = parseInt(searchParams.get('page') || '0', 10);

  const [metArtworks, rijksArtworks, chicagoArtworks] = await Promise.all([
    fetchMet(filter, page),
    fetchRijks(filter, page),
    fetchChicago(filter, page),
  ]);

  // Combine and ensure all have valid images
  const allArtworks = [...metArtworks, ...rijksArtworks, ...chicagoArtworks]
    .filter(a => a.image && a.image.length > 0);

  // Shuffle to mix museums
  const shuffled = allArtworks.sort(() => Math.random() - 0.5);

  return NextResponse.json({ artworks: shuffled.slice(0, 30) });
}
