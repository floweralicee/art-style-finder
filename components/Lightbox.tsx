'use client';

import { Artwork } from '@/lib/types';
import { MUSEUM_PALETTES, MUSEUMS } from '@/lib/museums';
import CopyButton from './CopyButton';

interface LightboxProps {
  artwork: Artwork;
  onClose: () => void;
  onStyleClick: (museum: string) => void;
}

export default function Lightbox({ artwork, onClose, onStyleClick }: LightboxProps) {
  const palette = MUSEUM_PALETTES[artwork.museum] || MUSEUM_PALETTES['met'];
  const museum = MUSEUMS.find(m => m.id === artwork.museum);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Content */}
      <div
        className="relative bg-[var(--surface)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-3/5 bg-[#1a1a1a] flex items-center justify-center p-4">
            <img
              src={artwork.image}
              alt={artwork.title}
              className="max-w-full max-h-[60vh] object-contain"
            />
          </div>

          {/* Details */}
          <div className="md:w-2/5 p-6 flex flex-col gap-4">
            <div>
              <span
                className="inline-block text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full text-white mb-2"
                style={{ backgroundColor: museum?.color || '#333' }}
              >
                {museum?.name || artwork.museum}
              </span>
              <h2 className="text-xl font-semibold text-[var(--text)]">{artwork.title}</h2>
              <p className="text-sm text-[var(--text-muted)] mt-1">{artwork.artist}</p>
            </div>

            {artwork.year && (
              <p className="text-sm"><span className="text-[var(--text-muted)]">Date:</span> {artwork.year}</p>
            )}
            {artwork.medium && (
              <p className="text-sm"><span className="text-[var(--text-muted)]">Medium:</span> {artwork.medium}</p>
            )}

            {/* Palette */}
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Museum Palette
              </h3>
              <div className="flex gap-2">
                {palette.map((color) => (
                  <div key={color} className="flex flex-col items-center gap-1">
                    <div
                      className="w-8 h-8 rounded-full border border-[var(--border)]"
                      style={{ backgroundColor: color }}
                    />
                    <CopyButton text={color} label="" className="!px-1 !py-0.5 !text-[9px]" />
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {artwork.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {artwork.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-0.5 bg-[var(--tag-bg)] rounded-full text-[var(--text-muted)]">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Style Finder button */}
            <button
              onClick={() => onStyleClick(artwork.museum)}
              className="mt-auto w-full py-3 px-4 bg-[var(--accent)] text-white rounded-lg font-medium hover:opacity-90 transition text-sm"
            >
              ✦ Use This Style →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
