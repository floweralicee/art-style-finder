'use client';

import { useState } from 'react';
import { Artwork } from '@/lib/types';

interface ArtCardProps {
  artwork: Artwork;
  onClick: (artwork: Artwork) => void;
}

export default function ArtCard({ artwork, onClick }: ArtCardProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div
      className="masonry-item cursor-pointer group"
      onClick={() => onClick(artwork)}
    >
      <div className="bg-[var(--surface)] rounded-lg overflow-hidden border border-[var(--border)] hover:shadow-lg transition-shadow">
        <div className="relative overflow-hidden">
          <img
            src={artwork.image}
            alt={artwork.title}
            loading="lazy"
            className="w-full h-auto block group-hover:scale-105 transition-transform duration-300"
            onError={() => setHidden(true)}
          />
        </div>
        <div className="p-3">
          <h3 className="text-sm font-medium leading-tight line-clamp-2 text-[var(--text)]">
            {artwork.title}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
            {artwork.artist}
          </p>
        </div>
      </div>
    </div>
  );
}
