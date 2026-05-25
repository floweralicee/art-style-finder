export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  matchWebsiteToArtwork,
  extractOgImageUrl,
} from '@/lib/palette-utils';
import { extractPaletteFromImageUrl } from '@/lib/extract-palette-server';
import { extractLandingPageColors } from '@/lib/extract-website-colors-server';
import { getPostHogClient } from '@/lib/posthog-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const websiteUrl = typeof body.websiteUrl === 'string' ? body.websiteUrl.trim() : '';
    const artworkColors = Array.isArray(body.artworkColors)
      ? body.artworkColors.filter((c: unknown): c is string => typeof c === 'string')
      : [];

    if (!websiteUrl) {
      return NextResponse.json({ error: 'websiteUrl is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
    } catch {
      return NextResponse.json({ error: 'Invalid website URL' }, { status: 400 });
    }

    const pageRes = await fetch(parsedUrl.href, {
      headers: { 'User-Agent': 'ArtStyleFinder/1.0' },
      redirect: 'follow',
    });

    if (!pageRes.ok) {
      return NextResponse.json({ error: 'Could not fetch website' }, { status: 422 });
    }

    const html = await pageRes.text();
    const pageUrl = pageRes.url || parsedUrl.href;
    const previewImageUrl = extractOgImageUrl(html, pageUrl);

    let websiteColors = await extractLandingPageColors(html, pageUrl);
    let source: 'landing-page' | 'og-image' = 'landing-page';

    if (websiteColors.length < 3 && previewImageUrl) {
      const imageColors = await extractPaletteFromImageUrl(previewImageUrl);
      if (imageColors) {
        websiteColors = imageColors;
        source = 'og-image';
      }
    }

    if (websiteColors.length === 0) {
      return NextResponse.json(
        { error: 'Could not extract colors from this landing page' },
        { status: 422 }
      );
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: 'server',
      event: 'website_match_api_called',
      properties: {
        website_url: parsedUrl.hostname,
        color_source: source,
        colors_found: websiteColors.length,
        has_artwork_colors: artworkColors.length > 0,
        has_preview_image: Boolean(previewImageUrl),
      },
    });

    const previewPayload = {
      websiteColors,
      source,
      previewImageUrl,
      websiteUrl: pageUrl,
    };

    if (artworkColors.length > 0) {
      const { score, suggestion, passesFilter } = matchWebsiteToArtwork(artworkColors, websiteColors);
      return NextResponse.json({
        ...previewPayload,
        score,
        suggestion: passesFilter ? suggestion : 'This artwork does not share your site\'s core color families.',
      });
    }

    return NextResponse.json(previewPayload);
  } catch {
    return NextResponse.json({ error: 'Failed to match website' }, { status: 500 });
  }
}
