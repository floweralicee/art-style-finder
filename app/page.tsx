'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Artwork } from '@/lib/types';
import ArtCard from '@/components/ArtCard';
import Lightbox from '@/components/Lightbox';
import StylePanel from '@/components/StylePanel';
import FilterBar from '@/components/FilterBar';
import MuseumTicker from '@/components/MuseumTicker';

export default function Home() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [styleMuseum, setStyleMuseum] = useState<string | null>(null);
  const [stylePanelArtwork, setStylePanelArtwork] = useState<Artwork | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchArtworks = useCallback(async (pageNum: number, currentFilter: string, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/artworks?filter=${currentFilter}&page=${pageNum}`);
      const data = await res.json();
      if (append) {
        setArtworks(prev => [...prev, ...data.artworks]);
      } else {
        setArtworks(data.artworks);
      }
    } catch (err) {
      console.error('Failed to fetch artworks:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchArtworks(0, filter, false);
  }, [filter, fetchArtworks]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          setPage(prev => {
            const nextPage = prev + 1;
            fetchArtworks(nextPage, filter, true);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [filter, fetchArtworks]);

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setPage(0);
    setArtworks([]);
  };

  const handleArtworkClick = (artwork: Artwork) => {
    setSelectedArtwork(artwork);
  };

  const handleStyleClick = (museum: string) => {
    setStyleMuseum(museum);
    setStylePanelArtwork(selectedArtwork);
    setSelectedArtwork(null);
  };

  const openStylePanel = () => {
    setStyleMuseum('met');
    setStylePanelArtwork(null);
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="sticky top-0 bg-[var(--bg)]/95 backdrop-blur-sm z-30 border-b border-[var(--border)]">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h1 className="text-xl font-bold text-[var(--text)]">
                World Art Archive
              </h1>
              <p className="text-xs text-[var(--text-muted)]">— 500K+ Works</p>
            </div>
            <button
              onClick={openStylePanel}
              className="px-4 py-2 text-sm font-medium bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition"
            >
              ✦ Style Finder
            </button>
          </div>
          <FilterBar active={filter} onChange={handleFilterChange} />
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">
        <div className="masonry-grid">
          {artworks.map((artwork) => (
            <ArtCard
              key={artwork.id}
              artwork={artwork}
              onClick={handleArtworkClick}
            />
          ))}
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="masonry-grid mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`skel-${i}`} className="masonry-item">
                <div className="bg-[var(--surface)] rounded-lg overflow-hidden border border-[var(--border)]">
                  <div className="skeleton h-48 w-full" />
                  <div className="p-3">
                    <div className="skeleton h-3 w-16 rounded mb-2" />
                    <div className="skeleton h-4 w-full rounded mb-1" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerRef} className="h-10" />
      </main>

      {/* Museum ticker */}
      <MuseumTicker />

      {/* Lightbox */}
      {selectedArtwork && (
        <Lightbox
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
          onStyleClick={handleStyleClick}
        />
      )}

      {/* Style Panel */}
      {styleMuseum && (
        <StylePanel
          museum={styleMuseum}
          artwork={stylePanelArtwork}
          onClose={() => setStyleMuseum(null)}
        />
      )}
    </div>
  );
}
