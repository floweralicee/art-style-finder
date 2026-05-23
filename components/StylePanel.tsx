'use client';

import { useState, useEffect } from 'react';
import { MUSEUM_PALETTES, MOVEMENTS, DESIGN_RECS, MUSEUMS } from '@/lib/museums';
import { deriveDesignRec } from '@/lib/palette-utils';
import { Artwork } from '@/lib/types';
import CopyButton from './CopyButton';

export interface WebsiteMatchData {
  score: number;
  websiteColors: string[];
  suggestion: string;
}

interface StylePanelProps {
  museum: string;
  artwork?: Artwork | null;
  artworkImageUrl?: string;
  websiteMatch?: WebsiteMatchData | null;
  onClose: () => void;
}

function buildDesignGuideText({
  palette,
  artwork,
  museumName,
  movements,
  designRec,
}: {
  palette: string[];
  artwork: Artwork | null | undefined;
  museumName: string;
  movements: string[];
  designRec: { h: string; b: string };
}): string {
  const [primary, secondary, dark, light, accent] = palette;
  const matchedWork = artwork
    ? `${artwork.title} by ${artwork.artist}${artwork.year ? ` · ${artwork.year}` : ''}`
    : `Collection inspiration — ${museumName}`;

  return `Here is my design guide — please follow these exact specifications for any UI, code, or design work:

🎨 DESIGN PALETTE
Primary: ${primary}
Secondary: ${secondary}
Dark: ${dark}
Light: ${light}
Accent: ${accent}

🖼 ART INSPIRATION
Matched Work: ${matchedWork}
Museum: ${museumName}
Medium: ${artwork?.medium || '—'}

🏛 ART MOVEMENT
${movements.join(' · ')}

✦ DESIGN DIRECTION — ${designRec.h}
${designRec.b}

USAGE RULES
- Use the Primary color for CTAs, links, and key UI elements
- Use the Light color for backgrounds and surface fills
- Use the Dark color for headings and high-contrast text
- Use Secondary and Accent as supporting tones for borders, icons, and hover states
- Keep layouts minimal — let the color palette do the talking
- Typography should feel editorial: serif for headings, clean sans-serif for body`;
}

function PaletteSwatches({ colors, label }: { colors: string[]; label: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
        {label}
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {colors.map((color) => (
          <div
            key={color}
            className="w-7 h-7 rounded-full border border-[var(--border)]"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

export default function StylePanel({
  museum,
  artwork,
  artworkImageUrl,
  websiteMatch,
  onClose,
}: StylePanelProps) {
  const fallbackPalette = MUSEUM_PALETTES[museum] || MUSEUM_PALETTES['met'];
  const movements = MOVEMENTS[museum] || MOVEMENTS['met'];
  const staticRecs = DESIGN_RECS[museum] || DESIGN_RECS['met'];
  const museumInfo = MUSEUMS.find(m => m.id === museum);

  const [extractedColors, setExtractedColors] = useState<string[] | null>(null);
  const [paletteLoading, setPaletteLoading] = useState(false);
  const [guideCopied, setGuideCopied] = useState(false);

  const displayPalette = extractedColors ?? fallbackPalette;
  const designRecs = extractedColors ? [deriveDesignRec(extractedColors)] : staticRecs;

  useEffect(() => {
    if (!artworkImageUrl) {
      setExtractedColors(null);
      setPaletteLoading(false);
      return;
    }

    let cancelled = false;
    setPaletteLoading(true);
    setExtractedColors(null);

    fetch('/api/extract-palette', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: artworkImageUrl }),
    })
      .then((res) => res.json())
      .then((data: { colors: string[] | null }) => {
        if (!cancelled) {
          setExtractedColors(data.colors ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setExtractedColors(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPaletteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artworkImageUrl]);

  const handleCopyDesignGuide = async () => {
    const guideText = buildDesignGuideText({
      palette: displayPalette,
      artwork,
      museumName: museumInfo?.name || museum,
      movements,
      designRec: designRecs[0],
    });

    try {
      await navigator.clipboard.writeText(guideText);
      setGuideCopied(true);
      setTimeout(() => setGuideCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy design guide:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Panel */}
      <div
        className="absolute right-0 top-0 h-full w-[400px] max-w-[90vw] bg-[var(--surface)] shadow-2xl overflow-y-auto slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] p-5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold">✦ Style Finder</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Inspired by {museumInfo?.name || museum}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--tag-bg)] transition"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6">
          {/* Design Palette */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Design Palette
            </h3>
            <div className="flex flex-col gap-2">
              {paletteLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={`skel-${i}`} className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 rounded-full skeleton shrink-0" />
                    <div className="skeleton h-4 w-20 rounded" />
                  </div>
                ))
              ) : (
                displayPalette.map((color) => (
                  <div key={color} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--tag-bg)] transition">
                    <div
                      className="w-8 h-8 rounded-full border border-[var(--border)] shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-mono text-[var(--text)]">{color}</span>
                    <div className="ml-auto">
                      <CopyButton text={color} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {websiteMatch && (
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Website Match
              </h3>
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <PaletteSwatches colors={displayPalette} label="Artwork" />
                  <PaletteSwatches colors={websiteMatch.websiteColors} label="Your Site" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-[var(--text)]">
                    {websiteMatch.score}
                    <span className="text-sm font-normal text-[var(--text-muted)]"> / 100</span>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    {websiteMatch.suggestion}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Art Movement Match */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Art Movement Match
            </h3>
            <div className="flex flex-wrap gap-2">
              {movements.map((movement) => (
                <span
                  key={movement}
                  className="px-3 py-1.5 text-xs font-medium rounded-full border border-[var(--border)] text-[var(--text)] bg-[var(--tag-bg)]"
                >
                  {movement}
                </span>
              ))}
            </div>
          </section>

          {/* Design Suggestions */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Design Suggestions
            </h3>
            <div className="flex flex-col gap-3">
              {designRecs.map((rec) => (
                <div key={rec.h} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-[var(--text)]">{rec.h}</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{rec.b}</p>
                    </div>
                    <CopyButton text={`${rec.h}: ${rec.b}`} className="shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={handleCopyDesignGuide}
            disabled={paletteLoading}
            className="w-full py-3 px-4 text-sm font-medium rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--tag-bg)] transition disabled:opacity-50"
          >
            {guideCopied ? 'Copied!' : 'Copy Full Design Guide'}
          </button>
        </div>
      </div>
    </div>
  );
}
