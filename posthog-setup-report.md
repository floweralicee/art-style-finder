<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the Artchive project. Here is a summary of all changes made:

**New files created:**
- `instrumentation-client.ts` — Client-side PostHog initialization using the Next.js 15.3+ `instrumentation-client` pattern. Enables automatic pageview tracking, session replay, and exception capture.
- `lib/posthog-server.ts` — Singleton server-side PostHog client (`posthog-node`) for capturing events from API routes.
- `.env.local` — PostHog public token and host set as environment variables (`NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`).

**Modified files:**
- `next.config.js` — Added reverse proxy rewrites for `/ingest/*` → PostHog ingestion endpoint and `/ingest/static/*`, `/ingest/array/*` → PostHog assets CDN. Also added `skipTrailingSlashRedirect: true`.
- `package.json` — Added `posthog-js` and `posthog-node` as dependencies.
- `components/CopyButton.tsx` — Added `color_copied` event on successful clipboard copy.
- `app/api/extract-palette/route.ts` — Added server-side `palette_extracted` event via `posthog-node`.

**Event tracking added to:**
- `components/ArtCard.tsx` — `artwork_clicked` on gallery card click
- `components/Lightbox.tsx` — `style_finder_opened` on "Use This Style" button
- `app/page.tsx` — `filter_changed`, `website_match_modal_opened`, `website_match_submitted`, `website_match_completed`, `website_match_failed` + exception capture on errors
- `components/StylePanel.tsx` — `design_guide_copied` + exception capture on clipboard errors
- `components/MatchResultModal.tsx` — `design_guide_copied`, `rematch_clicked` + exception capture
- `components/CopyButton.tsx` — `color_copied` on individual hex color/text copy
- `app/api/match-website/route.ts` — `website_match_api_called` server-side via `posthog-node`
- `app/api/extract-palette/route.ts` — `palette_extracted` server-side via `posthog-node`

## Events instrumented

| Event | Description | File |
|-------|-------------|------|
| `artwork_clicked` | User clicks on an art card to open the lightbox | `components/ArtCard.tsx` |
| `style_finder_opened` | User opens Style Finder panel from the artwork lightbox ("Use This Style" button) | `components/Lightbox.tsx` |
| `filter_changed` | User changes the artwork medium filter | `app/page.tsx` |
| `website_match_modal_opened` | User opens the "Find your style" website URL modal | `app/page.tsx` |
| `website_match_submitted` | User submits a website URL for palette matching | `app/page.tsx` |
| `website_match_completed` | Website palette match succeeded and results are shown | `app/page.tsx` |
| `website_match_failed` | Website palette match failed with an error | `app/page.tsx` |
| `design_guide_copied` | User copies the full design guide to clipboard | `components/StylePanel.tsx`, `components/MatchResultModal.tsx` |
| `rematch_clicked` | User clicks the Rematch button to find a new artwork match | `components/MatchResultModal.tsx` |
| `color_copied` | User copies an individual hex color or design rec text via any CopyButton | `components/CopyButton.tsx` |
| `website_match_api_called` | Server-side: website color extraction and matching was attempted | `app/api/match-website/route.ts` |
| `palette_extracted` | Server-side: palette extraction completed; includes success flag and color count | `app/api/extract-palette/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1620812)
- [Artwork Clicks Over Time](/insights/3pWDPVyJ) — daily unique users opening artworks
- [Style Finder Opens](/insights/oafh65Mj) — how often the Style Finder panel is opened
- [Website Match Conversion Funnel](/insights/P6wT4iVi) — submission → completion rate for website matching
- [Design Guide Copies](/insights/xJf9BjxL) — high-intent action tracking
- [Artwork Click → Design Guide Copy Funnel](/insights/kaoGe99E) — core end-to-end conversion funnel

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
