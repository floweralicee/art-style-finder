'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Artwork } from '@/lib/types';
import { MUSEUM_PALETTES } from '@/lib/museums';
import { matchWebsiteToArtwork, getSignatureFamilies } from '@/lib/palette-utils';
import ArtCard from '@/components/ArtCard';
import Lightbox from '@/components/Lightbox';
import StylePanel, { WebsiteMatchData } from '@/components/StylePanel';
import MatchResultModal from '@/components/MatchResultModal';
import FilterBar from '@/components/FilterBar';
import MuseumTicker from '@/components/MuseumTicker';
import WebsiteMatchModal from '@/components/WebsiteMatchModal';
import posthog from 'posthog-js';
import { withBasePath } from '@/lib/api-path';

type CreativeSearchMode = 'text' | 'url' | 'image';

type CreativeSearchMeta = {
  mode: CreativeSearchMode;
  colors?: string[];
  suggestion?: string;
  weakMatch?: boolean;
  label: string;
};

async function extractArtworkPalette(imageUrl: string): Promise<string[] | null> {
  const res = await fetch(withBasePath('/api/extract-palette'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  const data = await res.json();
  return data.colors ?? null;
}

const MATCH_CANDIDATE_TARGET = 100;
const PALETTE_BATCH_SIZE = 10;

type ScoredMatch = {
  artwork: Artwork;
  score: number;
  suggestion: string;
};

function isSculpture(artwork: Artwork): boolean {
  const haystack = [artwork.medium, ...artwork.tags].join(' ').toLowerCase();
  return haystack.includes('sculpt');
}

async function gatherMatchCandidates(
  filter: string,
  existing: Artwork[],
  targetCount = MATCH_CANDIDATE_TARGET
): Promise<Artwork[]> {
  const byId = new Map<string, Artwork>();
  for (const artwork of existing) {
    if (!isSculpture(artwork)) {
      byId.set(artwork.id, artwork);
    }
  }

  let pageNum = 0;
  while (byId.size < targetCount && pageNum < 15) {
    const res = await fetch(withBasePath(`/api/artworks?filter=${filter}&page=${pageNum}`));
    const data = await res.json();
    const batch: Artwork[] = data.artworks ?? [];
    if (batch.length === 0) break;

    for (const artwork of batch) {
      if (!isSculpture(artwork)) {
        byId.set(artwork.id, artwork);
      }
    }
    pageNum += 1;
  }

  return [...byId.values()].slice(0, targetCount);
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
  const websiteColorsCacheRef = useRef<{
    url: string;
    colors: string[];
    previewImageUrl: string | null;
    websiteUrl: string;
  } | null>(null);
  const matchCycleIndexRef = useRef(-1);
  const matchCandidatesCacheRef = useRef<{ url: string; candidates: ScoredMatch[] } | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [creativeMode, setCreativeMode] = useState<CreativeSearchMode>('text');
  const [creativeInput, setCreativeInput] = useState('');
  const [creativeImage, setCreativeImage] = useState<File | null>(null);
  const [creativeLoading, setCreativeLoading] = useState(false);
  const [creativeError, setCreativeError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Artwork[] | null>(null);
  const [searchMeta, setSearchMeta] = useState<CreativeSearchMeta | null>(null);
  const creativeFileRef = useRef<HTMLInputElement>(null);
  const isSearchActive = searchResults !== null;

  const fetchArtworks = useCallback(async (pageNum: number, currentFilter: string, append: boolean) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetch(withBasePath(`/api/artworks?filter=${currentFilter}&page=${pageNum}`));
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

  // Infinite scroll — paused while creative search results are shown
  useEffect(() => {
    if (isSearchActive) return;

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
  }, [filter, fetchArtworks, isSearchActive]);

  const handleFilterChange = (newFilter: string) => {
    posthog.capture('filter_changed', { filter: newFilter, previous_filter: filter });
    setFilter(newFilter);
    setPage(0);
    setArtworks([]);
    matchCycleIndexRef.current = -1;
    matchCandidatesCacheRef.current = null;
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

    posthog.capture('website_match_submitted', { website_url: url, filter });
    setWebsiteMatchLoading(true);
    setWebsiteMatchError(null);

    try {
      await runWebsiteMatch(url);
      setShowWebsiteModal(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Could not match website';
      posthog.capture('website_match_failed', { website_url: url, error: errorMessage });
      posthog.captureException(err);
      setWebsiteMatchError(errorMessage);
    } finally {
      setWebsiteMatchLoading(false);
    }
  };

  const runWebsiteMatch = async (url: string) => {
    let websiteColors: string[];
    let previewImageUrl: string | null;
    let resolvedWebsiteUrl: string;

    if (websiteColorsCacheRef.current?.url === url) {
      websiteColors = websiteColorsCacheRef.current.colors;
      previewImageUrl = websiteColorsCacheRef.current.previewImageUrl;
      resolvedWebsiteUrl = websiteColorsCacheRef.current.websiteUrl;
    } else {
      const res = await fetch(withBasePath('/api/match-website'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: url }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not match website');
      }

      websiteColors = data.websiteColors as string[];
      previewImageUrl = (data.previewImageUrl as string | null) ?? null;
      resolvedWebsiteUrl = (data.websiteUrl as string) || url;
      websiteColorsCacheRef.current = {
        url,
        colors: websiteColors,
        previewImageUrl,
        websiteUrl: resolvedWebsiteUrl,
      };
      matchCycleIndexRef.current = -1;
      matchCandidatesCacheRef.current = null;
    }

    let scoredMatches = matchCandidatesCacheRef.current?.url === url
      ? matchCandidatesCacheRef.current.candidates
      : null;

    if (!scoredMatches) {
      const candidates = await gatherMatchCandidates(filter, artworks);

      for (let i = 0; i < candidates.length; i += PALETTE_BATCH_SIZE) {
        const batch = candidates.slice(i, i + PALETTE_BATCH_SIZE);
        await Promise.all(
          batch.map(async (artwork) => {
            if (!paletteCacheRef.current.has(artwork.id)) {
              await getArtworkPalette(artwork);
            }
          })
        );
      }

      scoredMatches = candidates
        .map((artwork) => {
          const artworkColors = paletteCacheRef.current.get(artwork.id)
            ?? MUSEUM_PALETTES[artwork.museum]
            ?? MUSEUM_PALETTES.met;
          const result = matchWebsiteToArtwork(artworkColors, websiteColors);
          return {
            artwork,
            score: result.score,
            suggestion: result.suggestion,
            passesFilter: result.passesFilter,
          };
        })
        .filter((entry) => entry.passesFilter)
        .sort((a, b) => b.score - a.score)
        .map(({ artwork, score, suggestion }) => ({ artwork, score, suggestion }));

      if (scoredMatches.length === 0) {
        const signatures = getSignatureFamilies(websiteColors);
        if (signatures.length === 0) {
          throw new Error('No matching artworks found for your neutral site palette. Try browsing more works or switching filters.');
        }

        const familyNames = signatures.map((s) => s.label).join(' and ');
        throw new Error(
          `No artworks found with your site's ${familyNames} color tones. Try a different filter or rematch after more works load.`
        );
      }

      matchCandidatesCacheRef.current = { url, candidates: scoredMatches };
      matchCycleIndexRef.current = -1;
    }

    matchCycleIndexRef.current = (matchCycleIndexRef.current + 1) % scoredMatches.length;
    const pick = scoredMatches[matchCycleIndexRef.current];

    posthog.capture('website_match_completed', {
      website_url: url,
      match_score: pick.score,
      artwork_id: pick.artwork.id,
      artwork_title: pick.artwork.title,
      artwork_museum: pick.artwork.museum,
    });
    setWebsiteMatch({
      score: pick.score,
      websiteColors,
      suggestion: pick.suggestion,
      websiteUrl: resolvedWebsiteUrl,
      previewImageUrl,
    });
    setStylePanelArtwork(pick.artwork);
    setStyleMuseum(pick.artwork.museum);
    setSelectedArtwork(null);
  };

  const handleRematch = async () => {
    const url = websiteUrl.trim();
    if (!url || artworks.length === 0 || !websiteColorsCacheRef.current) return;

    setWebsiteMatchLoading(true);
    try {
      await runWebsiteMatch(url);
    } catch {
      // keep current match visible on rematch failure
    } finally {
      setWebsiteMatchLoading(false);
    }
  };

  const handleOpenWebsiteModal = () => {
    posthog.capture('website_match_modal_opened');
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
      matchCandidatesCacheRef.current = null;
    }
  };

  const handleCloseStylePanel = () => {
    setStyleMuseum(null);
    setWebsiteMatch(null);
    setStylePanelArtwork(null);
  };

  const handleCloseMatchResult = () => {
    handleCloseStylePanel();
  };

  const handleCreativeModeChange = (mode: CreativeSearchMode) => {
    setCreativeMode(mode);
    setCreativeError(null);
    if (mode !== 'image') {
      setCreativeImage(null);
    }
  };

  const handleCreativeImageSelect = (file: File | null) => {
    setCreativeImage(file);
    setCreativeError(null);
  };

  const handleCreativeSearch = async () => {
    setCreativeLoading(true);
    setCreativeError(null);

    try {
      if (creativeMode === 'text') {
        const input = creativeInput.trim();
        if (!input) {
          setCreativeError('Describe your vibe to search.');
          return;
        }

        posthog.capture('creative_search_submitted', { mode: 'text', input_length: input.length });
        const res = await fetch(withBasePath('/api/creative-search'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'text', input }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Search failed');

        setSearchResults(data.artworks ?? []);
        setSearchMeta({
          mode: 'text',
          weakMatch: data.weakMatch,
          label: `Results for “${input}”`,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (creativeMode === 'url') {
        const url = creativeInput.trim();
        if (!url) {
          setCreativeError('Paste a website URL to search.');
          return;
        }

        posthog.capture('creative_search_submitted', { mode: 'url', website_url: url });
        const res = await fetch(withBasePath('/api/match-website'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Website match failed');

        setSearchResults(data.artworks ?? []);
        setSearchMeta({
          mode: 'url',
          colors: data.websiteColors,
          suggestion: data.suggestion,
          weakMatch: data.weakMatch,
          label: 'Your site palette',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (!creativeImage) {
        setCreativeError('Drop or choose an image to search.');
        return;
      }

      posthog.capture('creative_search_submitted', {
        mode: 'image',
        file_type: creativeImage.type,
        file_size: creativeImage.size,
      });
      const formData = new FormData();
      formData.append('image', creativeImage);
      const res = await fetch(withBasePath('/api/match-image'), {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image match failed');

      setSearchResults(data.artworks ?? []);
      setSearchMeta({
        mode: 'image',
        colors: data.imageColors,
        weakMatch: data.weakMatch,
        label: 'Your image palette',
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setCreativeError(message);
      posthog.captureException(err);
    } finally {
      setCreativeLoading(false);
    }
  };

  const handleBackToGallery = () => {
    setSearchResults(null);
    setSearchMeta(null);
    setCreativeError(null);
  };

  const displayedArtworks = searchResults ?? artworks;

  return (
    <div className="min-h-screen pb-12">
      <div style={{ height: headerHeight || undefined }} aria-hidden={headerHidden} />

      {/* Header */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 bg-[var(--bg)] z-30"
        style={{
          transform: `translateY(-${headerOffset}px)`,
          opacity: headerHeight > 0 ? 1 - headerOffset / headerHeight : 1,
          pointerEvents: headerHidden ? 'none' : 'auto',
        }}
      >
        <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-0">
          <div>
            <p className="artchive-wordmark text-[var(--text)] mb-4">Artchive.</p>
            <h1 className="text-2xl font-bold text-[var(--text)] leading-snug mb-2">
              build something no AI could ever generate
            </h1>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Find your perfect design identity from{' '}
              <span className="font-bold text-[var(--text)]">500k+ works</span>
              {' '}across the world&apos;s greatest museums.
            </p>
          </div>
        </div>
      </header>

      {/* Creative search — in document flow so it never overlaps results */}
      <section className="max-w-[1400px] mx-auto px-4 pb-4">
        <div className="my-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_28px_90px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">✦ Find Your Inspiration</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Describe a vibe, paste a URL, or drop an image
              </p>
            </div>
          </div>

          <div
            className="rounded-full border-2 border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 flex flex-wrap items-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_40px_-16px_rgba(0,0,0,0.45)]"
            onDragOver={(e) => {
              if (creativeMode === 'image') e.preventDefault();
            }}
            onDrop={(e) => {
              if (creativeMode !== 'image') return;
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file?.type.startsWith('image/')) {
                handleCreativeImageSelect(file);
              }
            }}
          >
            <div className="flex items-center gap-1 shrink-0">
              {(['text', 'url', 'image'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleCreativeModeChange(mode)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                    creativeMode === mode
                      ? 'bg-[var(--accent)] text-white shadow-md'
                      : 'text-[var(--text-muted)] hover:bg-[var(--tag-bg)]'
                  }`}
                >
                  {mode === 'text' ? 'Text' : mode === 'url' ? 'URL' : 'Image'}
                </button>
              ))}
            </div>

            {creativeMode === 'image' ? (
              <button
                type="button"
                onClick={() => creativeFileRef.current?.click()}
                className="flex-1 min-w-[180px] text-left px-3 py-2 text-sm text-[var(--text-muted)] truncate hover:text-[var(--text)] transition"
              >
                {creativeImage ? creativeImage.name : 'Drop an image or click to upload…'}
              </button>
            ) : (
              <input
                type={creativeMode === 'url' ? 'url' : 'text'}
                value={creativeInput}
                onChange={(e) => {
                  setCreativeInput(e.target.value);
                  setCreativeError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreativeSearch();
                }}
                placeholder={
                  creativeMode === 'url'
                    ? 'Paste a website URL…'
                    : 'Describe your vibe, paste a URL, or drop an image...'
                }
                className="flex-1 min-w-[180px] bg-transparent px-2 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
              />
            )}

            <input
              ref={creativeFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleCreativeImageSelect(e.target.files?.[0] ?? null)}
            />

            <button
              type="button"
              onClick={handleCreativeSearch}
              disabled={creativeLoading}
              className="shrink-0 px-5 py-2.5 text-sm font-semibold rounded-full bg-[var(--accent)] text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] hover:opacity-90 transition disabled:opacity-50"
            >
              {creativeLoading ? 'Searching…' : 'Search'}
            </button>
          </div>

          {creativeError && (
            <p className="mt-3 text-sm text-red-600">{creativeError}</p>
          )}
        </div>

        <div className="flex justify-end">
          <FilterBar active={filter} onChange={handleFilterChange} />
        </div>
      </section>

      {/* Gallery */}
      <main className="max-w-[1400px] mx-auto px-4 pb-6 pt-4">
        {isSearchActive && (
          <div className="mb-6 flex flex-col gap-4">
            <button
              type="button"
              onClick={handleBackToGallery}
              className="self-start px-4 py-2 text-sm font-medium rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--tag-bg)] transition"
            >
              ← Back to full gallery
            </button>

            {searchMeta && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text)]">{searchMeta.label}</p>
                  {searchMeta.weakMatch && (
                    <p className="text-xs text-[var(--text-muted)]">
                      No strong matches — showing closest artworks
                    </p>
                  )}
                </div>

                {searchMeta.colors && searchMeta.colors.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-1.5 flex-wrap">
                      {searchMeta.colors.map((color) => (
                        <div
                          key={color}
                          className="w-7 h-7 rounded-full border border-[var(--border)]"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                    {searchMeta.suggestion && (
                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {searchMeta.suggestion}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="masonry-grid">
          {displayedArtworks.map((artwork) => (
            <ArtCard
              key={artwork.id}
              artwork={artwork}
              onClick={handleArtworkClick}
            />
          ))}
        </div>

        {/* Loading skeletons */}
        {loading && !isSearchActive && (
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
        {!isSearchActive && <div ref={observerRef} className="h-10" />}
      </main>

      {/* Museum ticker */}
      <MuseumTicker />

      {/* Lightbox — only when not in website match flow */}
      {selectedArtwork && !websiteMatch && (
        <Lightbox
          artwork={selectedArtwork}
          onClose={() => setSelectedArtwork(null)}
          onStyleClick={handleStyleClick}
        />
      )}

      {/* Unified website match result */}
      {websiteMatch && stylePanelArtwork && (
        <MatchResultModal
          artwork={stylePanelArtwork}
          websiteMatch={websiteMatch}
          onClose={handleCloseMatchResult}
          onRematch={handleRematch}
          rematchLoading={websiteMatchLoading}
        />
      )}

      {/* Style Panel — manual lightbox flow only */}
      {styleMuseum && !websiteMatch && (
        <StylePanel
          museum={styleMuseum}
          artwork={stylePanelArtwork}
          artworkImageUrl={stylePanelArtwork?.image}
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
