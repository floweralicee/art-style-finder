'use client';

import { MUSEUM_PALETTES, MOVEMENTS, DESIGN_RECS, MUSEUMS } from '@/lib/museums';
import { Artwork } from '@/lib/types';
import CopyButton from './CopyButton';

interface StylePanelProps {
  museum: string;
  artwork?: Artwork | null;
  onClose: () => void;
}

export default function StylePanel({ museum, artwork, onClose }: StylePanelProps) {
  const palette = MUSEUM_PALETTES[museum] || MUSEUM_PALETTES['met'];
  const movements = MOVEMENTS[museum] || MOVEMENTS['met'];
  const recs = DESIGN_RECS[museum] || DESIGN_RECS['met'];
  const museumInfo = MUSEUMS.find(m => m.id === museum);

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
          {/* Brand Palette */}
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Your Brand Palette
            </h3>
            <div className="flex flex-col gap-2">
              {palette.map((color) => (
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
              ))}
            </div>
          </section>

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
              {recs.map((rec) => (
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

          {/* Matched Work info */}
          {artwork && (
            <section>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Matched Work
              </h3>
              <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <p className="text-sm font-medium">{artwork.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {artwork.artist}{artwork.year ? ` · ${artwork.year}` : ''}
                </p>
                {artwork.medium && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">{artwork.medium}</p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
