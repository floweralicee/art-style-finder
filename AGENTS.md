<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:artchive-style-finder -->
# Style Finder — Artwork-Driven Palette Extraction

## What exists today (do not break)

- `lib/museums.ts` — static presets per museum: 5 hex brand colors, movement labels, design copy. Used as a fallback only after this change.
- `StylePanel` — side panel opened two ways:
  1. Header "✦ Style Finder" → opens for Met, no artwork context
  2. Lightbox "✦ Use This Style →" → opens with the clicked artwork's museum id
- `app/api/artworks/route.ts` — merges Met, Rijks, Chicago results. Do not touch.
- `FilterBar` — filters by medium type. Not connected to Style Finder. Do not touch.

## What is broken / wrong

`StylePanel` shows the same static museum palette for every artwork in that museum. A pale Greek marble and a vivid Rembrandt both show the same Met burgundy/gold/navy. The palette must come from the actual artwork image, not the museum identity.

## What to build

### 1. New API route — `app/api/extract-palette/route.ts`

- Accepts POST with body `{ imageUrl: string }`
- Fetches the image server-side (avoids CORS)
- Extracts 5 dominant hex colors from the pixel data
- Use `node-vibrant` (`npm install node-vibrant`) — it returns Vibrant, Muted, DarkVibrant, LightVibrant, DarkMuted swatches, map those to a 5-hex array
- If fetch fails or image is unreachable, fall back to returning null so the caller can use the museum preset
- Returns `{ colors: string[] | null }`

### 2. Update `StylePanel`

- Add prop: `artworkImageUrl?: string`
- On mount (or when `artworkImageUrl` changes), call `POST /api/extract-palette` with that URL
- While loading, show skeleton placeholder swatches
- On success, replace the static museum palette with the extracted colors
- On failure (null response), silently fall back to `lib/museums.ts` preset for that museum
- The movement label and design copy blocks can still come from the museum preset — only the color swatches change
- Do NOT change the StylePanel's visual structure or open/close behavior

### 3. Update the Lightbox → StylePanel handoff in `app/page.tsx`

- When opening StylePanel from the lightbox, pass the artwork's primary image URL as `artworkImageUrl`
- Check what field the artwork object uses for its image (likely `primaryImage`, `imageUrl`, or `webImage.url` depending on museum) — pass whichever is present
- The header "✦ Style Finder" path (no artwork context) passes no `artworkImageUrl`, so it falls back to the Met preset as before

### 4. Derive design suggestions from extracted colors (optional enhancement)

Once real colors are extracted, improve the copy dynamically:
- Classify palette: warm (avg hue 0–60 or 300–360) vs cool (180–270) vs neutral
- Classify saturation: vivid (avg S > 0.5) vs muted (avg S < 0.3)
- Classify lightness: light (avg L > 0.6) vs dark (avg L < 0.4)
- Pick one of ~6 short copy templates based on the classification (e.g. "Warm & Vivid → Expressive, Bold", "Cool & Muted → Editorial, Calm")
- Keep the museum movement label ("Dutch Golden Age", "Renaissance") from the preset — do not try to classify that from the image

### 5. New feature — website URL matcher in StylePanel

Add a small input section at the bottom of StylePanel:

```
[ Paste your website URL ] [ Match ]
```

On submit:
- Call a new route `app/api/match-website/route.ts`
- That route fetches the page, extracts the OG image URL from `<meta property="og:image">`, then calls the palette extraction logic on that OG image
- Compare the website palette to the artwork palette using Euclidean distance in RGB space (average distance across all 5 color pairs after sorting both by luminance)
- Return `{ score: number (0–100), websiteColors: string[], suggestion: string }`
- `suggestion` is a one-liner: e.g. "Your site's cool tones complement this work's muted blues well." or "High contrast — this piece would anchor your minimal layout."
- Display the website palette swatches side-by-side with the artwork palette in the panel, with the score and suggestion below

## Constraints

- Do not change `lib/museums.ts` — it is still the fallback and source of movement/copy data
- Do not change `FilterBar` or `app/api/artworks/route.ts`
- Do not change how StylePanel opens or closes
- Keep all new API routes under `app/api/`
- All image fetching must happen server-side (API routes), never from the browser directly, to avoid CORS
- If `node-vibrant` causes build issues with the Next.js edge runtime, move the route to use `runtime = 'nodejs'` at the top of the file

## Files to read before changing anything

- `lib/museums.ts`
- The `StylePanel` component file (wherever it lives)
- `app/page.tsx` — specifically the Lightbox open handler and the StylePanel render
- `app/api/artworks/route.ts` — to understand the artwork object shape (especially image URL field names per museum)
<!-- END:artchive-style-finder -->
