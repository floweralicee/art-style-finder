'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Artwork } from '@/lib/types';
import { MUSEUM_PALETTES } from '@/lib/museums';
import { comparePalettes } from '@/lib/palette-utils';
import ArtCard from '@/components/ArtCard';
import Lightbox from '@/components/Lightbox';
import StylePanel, { WebsiteMatchData } from '@/components/StylePanel';
import FilterBar from '@/components/FilterBar';
import MuseumTicker from '@/components/MuseumTicker';
import WebsiteMatchModal from '@/components/WebsiteMatchModal';

async function extractArtworkPalette(imageUrl: string): Promise<string[] | null> {
  const res = await fetch('/api/extract-palette', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  const data = await res.json();
  return data.colors ?? null;
}

export default function Home() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [styleMuseum, setStyleMuseum] = useState<string | null>(null);
  const [stylePanelArtwork, setStylePanelArtwork] = useState<Artwork | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [websiteMatchLoading, setWebsiteMatchLoading] = useState(false);
  const [websiteMatchError, setWebsiteMatchError] = useState<string | null>(null);
  const [websiteMatch, setWebsiteMatch] = useState<WebsiteMatchData | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const loadingRef = useRef(false);
  const paletteCacheRef = useRef<Map<string, string[]>>(new Map());
  const websiteColorsCacheRef = useRef<{ url: string; colors: string[] } | null>(null);
  const matchCycleIndexRef = useRef(-1);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const fetchArtworks = useCallback(async (pageNum: number, currentFilter: string, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(`/api/artworks?filter=${currentFilter}&page=${pageNum}`);
      const data = await res.json();
      if (append) {
        setArtworks(prev => {
          const seen = new Set(prev.map(a => a.id));
          const newArtworks = data.artworks.filter((a: Artwork) => !seen.has(a.id));
          return [...prev, ...newArtworks];
        });
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

  useEffect(() => {
    const measureHeader = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    measureHeader();
    window.addEventListener('resize', measureHeader);

    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('resize', measureHeader);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const headerOffset = Math.min(scrollY, headerHeight);
  const headerHidden = headerHeight > 0 && scrollY >= headerHeight;

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
    matchCycleIndexRef.current = -1;
  };

  const handleArtworkClick = (artwork: Artwork) => {
    setSelectedArtwork(artwork);
  };

  const handleStyleClick = (museum: string) => {
    setWebsiteMatch(null);
    setStyleMuseum(museum);
    setStylePanelArtwork(selectedArtwork);
    setSelectedArtwork(null);
  };

  const getArtworkPalette = useCallback(async (artwork: Artwork): Promise<string[]> => {
    const cached = paletteCacheRef.current.get(artwork.id);
    if (cached) return cached;

    const extracted = await extractArtworkPalette(artwork.image);
    const palette = extracted ?? MUSEUM_PALETTES[artwork.museum] ?? MUSEUM_PALETTES.met;
    paletteCacheRef.current.set(artwork.id, palette);
    return palette;
  }, []);

  const handleWebsiteMatch = async () => {
    const url = websiteUrl.trim();
    if (!url || artworks.length === 0) return;

    setWebsiteMatchLoading(true);
    setWebsiteMatchError(null);

    try {
      let websiteColors: string[];

      if (websiteColorsCacheRef.current?.url === url) {
        websiteColors = websiteColorsCacheRef.current.colors;
      } else {
        const res = await fetch('/api/match-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ websiteUrl: url }),
        });

        const data = await res.json();
        if (!res.ok) {
          setWebsiteMatchError(data.error || 'Could not match website');
          return;
        }

        websiteColors = data.websiteColors as string[];
        websiteColorsCacheRef.current = { url, colors: websiteColors };
        matchCycleIndexRef.current = -1;
      }

      const candidates = artworks.slice(0, 30);

      await Promise.all(
        candidates.map(async (artwork) => {
          if (!paletteCacheRef.current.has(artwork.id)) {
            await getArtworkPalette(artwork);
          }
        })
      );

      const scored = candidates
        .map((artwork) => {
          const artworkColors = paletteCacheRef.current.get(artwork.id)
            ?? MUSEUM_PALETTES[artwork.museum]
            ?? MUSEUM_PALETTES.met;
          const { score, suggestion } = comparePalettes(artworkColors, websiteColors);
          return { artwork, score, suggestion };
        })
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) return;

      matchCycleIndexRef.current = (matchCycleIndexRef.current + 1) % scored.length;
      const pick = scored[matchCycleIndexRef.current];

      const match: WebsiteMatchData = {
        score: pick.score,
        websiteColors,
        suggestion: pick.suggestion,
      };

      setWebsiteMatch(match);
      setSelectedArtwork(pick.artwork);
      setStyleMuseum(pick.artwork.museum);
      setStylePanelArtwork(pick.artwork);
      setShowWebsiteModal(false);
    } catch {
      setWebsiteMatchError('Could not match website');
    } finally {
      setWebsiteMatchLoading(false);
    }
  };

  const handleOpenWebsiteModal = () => {
    setWebsiteMatchError(null);
    setShowWebsiteModal(true);
  };

  const handleCloseWebsiteModal = () => {
    setShowWebsiteModal(false);
    setWebsiteMatchError(null);
  };

  const handleWebsiteUrlChange = (url: string) => {
    setWebsiteUrl(url);
    if (websiteColorsCacheRef.current?.url !== url.trim()) {
      matchCycleIndexRef.current = -1;
    }
  };

  const handleCloseStylePanel = () => {
    setStyleMuseum(null);
    setWebsiteMatch(null);
  };

  return (
    <div className="min-h-screen pb-12">
      <div style={{ height: headerHeight || undefined }} aria-hidden={headerHidden} />

      {/* Header */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 bg-[var(--bg)] z-30 border-b border-[var(--border)]"
        style={{
          transform: `translateY(-${headerOffset}px)`,
          opacity: headerHeight > 0 ? 1 - headerOffset / headerHeight : 1,
          pointerEvents: headerHidden ? 'none' : 'auto',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-4">
          <div>
            <p className="artchive-wordmark text-[var(--text)] mb-4">Artchive.</p>
            <h1 className="text-2xl font-bold text-[var(--text)] leading-snug mb-2">
              Turn museum masterpieces into your brand&apos;s design language.
            </h1>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Find your perfect design identity from{' '}
              <span className="font-bold text-[var(--text)]">500k+ works</span>
              {' '}across the world&apos;s greatest museums.
            </p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleOpenWebsiteModal}
                disabled={artworks.length === 0}
                className="shrink-0 px-5 py-2.5 text-sm font-medium bg-[var(--accent)] text-white rounded-full hover:opacity-90 transition disabled:opacity-50"
              >
                Find your style
              </button>
              <FilterBar active={filter} onChange={handleFilterChange} />
            </div>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-[1400px] mx-auto px-4 pb-6">
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
          artworkImageUrl={stylePanelArtwork?.image}
          websiteMatch={websiteMatch}
          onClose={handleCloseStylePanel}
        />
      )}

      {showWebsiteModal && (
        <WebsiteMatchModal
          websiteUrl={websiteUrl}
          loading={websiteMatchLoading}
          error={websiteMatchError}
          onUrlChange={handleWebsiteUrlChange}
          onSubmit={handleWebsiteMatch}
          onClose={handleCloseWebsiteModal}
        />
      )}
    </div>
  );
}
