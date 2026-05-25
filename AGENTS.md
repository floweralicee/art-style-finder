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

### 5. Creative Search Bar — "Find Your Inspiration"

This is the primary discovery feature. A floating search bar at the bottom of the main gallery page (`app/page.tsx`) that accepts three input types and finds the most relevant artworks from the archive.

#### UI
- Pill-shaped floating bar fixed at the bottom center of the page
- Placeholder text: "Describe your vibe, paste a URL, or drop an image..."
- Three mode buttons on the left of the input: **Text** | **URL** | **Image**
- A single **Search** button on the right
- Subtle, minimal — does not obstruct the gallery

#### Mode 1 — Text description
User types a creative intent: "watercolor botanical soft Japanese" or "dark moody chiaroscuro portrait" or just "melancholy"

Flow:
- Send to `POST /api/creative-search` with `{ type: "text", input: "..." }`
- Server translates the description into 3–5 museum search keywords using a hardcoded mood-to-keyword map in `lib/moodKeywords.ts`
- Mood map examples:
  - "melancholy" → ["nocturne", "shadow", "solitude", "dark", "figure"]
  - "minimal" → ["sketch", "line", "simple", "geometric", "white"]
  - "warm" → ["golden", "sunlight", "amber", "harvest", "fire"]
  - "watercolor" → ["watercolor", "wash", "botanical", "delicate", "ink"]
  - "electric" → ["vivid", "bold", "colour", "abstract", "dynamic"]
- If no mood map match, fall back to passing the raw text directly as a museum API keyword search
- Hit all three museum APIs with the translated keywords
- Return top 20 results ranked by palette warmth/coolness match to the described mood
- Replace the current gallery grid with these results

#### Mode 2 — Website URL
User pastes their site URL: "https://mysite.com"

Flow:
- Send to `POST /api/match-website` with `{ url: "..." }`
- Server fetches the page, extracts OG image from `<meta property="og:image">`
- Extracts palette from OG image using `node-vibrant`
- Searches museum APIs for artworks and scores them by Euclidean RGB distance to the site palette
- Returns top 20 closest matching artworks + `{ websiteColors: string[], suggestion: string }`
- Replace gallery grid with results
- Show a small "Your site palette" swatch row above the results with the suggestion

#### Mode 3 — Image upload
User drops or selects an image file

Flow:
- Send to `POST /api/match-image` with the image as `multipart/form-data`
- Server extracts palette from the uploaded image using `node-vibrant`
- Searches museum APIs and scores artworks by palette distance (same RGB math as Mode 2)
- Returns top 20 closest matching artworks
- Replace gallery grid with results
- Show "Your image palette" swatch row above the results

#### Shared result behaviour (all three modes)
- Show a "Back to full gallery" button above results to reset
- Each result card is identical to the existing gallery cards — click opens the same lightbox
- Results are not paginated — show all 20 at once
- If fewer than 5 results found, show a "No strong matches — showing closest artworks" message

### 6. New API routes needed

#### `app/api/creative-search/route.ts`
- POST `{ type: "text", input: string }`
- Loads `lib/moodKeywords.ts` map, translates input to keywords
- Queries Met, Rijks, Chicago with those keywords
- Returns `{ artworks: Artwork[] }`
- Add `export const runtime = 'nodejs'` at top

#### `app/api/match-website/route.ts`
- POST `{ url: string }`
- Fetches page HTML server-side, parses OG image tag
- Extracts palette from OG image via `node-vibrant`
- Queries all three museum APIs, scores by palette distance
- Returns `{ artworks: Artwork[], websiteColors: string[], suggestion: string }`
- Add `export const runtime = 'nodejs'` at top

#### `app/api/match-image/route.ts`
- POST multipart/form-data with image file
- Extracts palette from uploaded image via `node-vibrant`
- Queries all three museum APIs, scores by palette distance
- Returns `{ artworks: Artwork[], imageColors: string[] }`
- Add `export const runtime = 'nodejs'` at top

### 7. New lib file — `lib/moodKeywords.ts`

Hardcoded map of ~50 mood/style words to museum search keyword arrays. Start with at least:
- melancholy, minimal, warm, cool, electric, dark, light, bold, soft, geometric, floral, portrait, landscape, abstract, watercolor, ink, gold, blue, red, monochrome, vintage, modern, romantic, dramatic, peaceful, chaotic, earthy, pastel, vivid, gothic

## Constraints

- Do not change `lib/museums.ts` — it is still the fallback and source of movement/copy data
- Do not change `FilterBar` or `app/api/artworks/route.ts`
- Do not change how StylePanel opens or closes
- Keep all new API routes under `app/api/`
- All image fetching must happen server-side (API routes), never from the browser directly, to avoid CORS
- If `node-vibrant` causes build issues with the Next.js edge runtime, move the route to use `runtime = 'nodejs'` at the top of the file
- The floating search bar must not break the existing infinite scroll gallery behaviour — results replace the grid temporarily, "Back to full gallery" restores it

## Files to read before changing anything

- `lib/museums.ts`
- The `StylePanel` component file (wherever it lives)
- `app/page.tsx` — specifically the Lightbox open handler, the StylePanel render, and the gallery grid state
- `app/api/artworks/route.ts` — to understand the artwork object shape (especially image URL field names per museum)
<!-- END:artchive-style-finder -->
