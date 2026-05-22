'use client';

import { MUSEUMS } from '@/lib/museums';

export default function MuseumTicker() {
  const items = [...MUSEUMS, ...MUSEUMS, ...MUSEUMS, ...MUSEUMS];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)] border-t border-[var(--border)] py-2 overflow-hidden z-40">
      <div className="ticker-animate flex whitespace-nowrap">
        {items.map((museum, i) => (
          <span key={`${museum.id}-${i}`} className="inline-flex items-center gap-2 mx-6">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: museum.color }}
            />
            <span className="text-xs text-[var(--text-muted)] font-medium">
              {museum.name}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
