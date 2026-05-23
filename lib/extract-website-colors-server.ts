const TAILWIND_COLORS: Record<string, Partial<Record<number | 'DEFAULT', string>>> = {
  white: { DEFAULT: '#FFFFFF' },
  black: { DEFAULT: '#000000' },
  transparent: { DEFAULT: '#FFFFFF' },
  gray: {
    50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB',
    400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151',
    800: '#1F2937', 900: '#111827', 950: '#030712',
  },
  slate: {
    50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1',
    400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155',
    800: '#1E293B', 900: '#0F172A', 950: '#020617',
  },
  blue: {
    50: '#EFF6FF', 100: '#DBEAFE', 200: '#BFDBFE', 300: '#93C5FD',
    400: '#60A5FA', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8',
    800: '#1E40AF', 900: '#1E3A8A', 950: '#172554',
  },
  red: {
    50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626',
    700: '#B91C1C', 800: '#991B1B', 900: '#7F1D1D',
  },
  green: {
    50: '#F0FDF4', 100: '#DCFCE7', 500: '#22C55E', 600: '#16A34A',
    700: '#15803D', 800: '#166534', 900: '#14532D',
  },
  yellow: {
    50: '#FEFCE8', 100: '#FEF9C3', 400: '#FACC15', 500: '#EAB308',
  },
  orange: {
    50: '#FFF7ED', 100: '#FFEDD5', 500: '#F97316', 600: '#EA580C',
  },
  amber: {
    50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706',
  },
  purple: {
    50: '#FAF5FF', 100: '#F3E8FF', 500: '#A855F7', 600: '#9333EA',
  },
  pink: {
    50: '#FDF2F8', 100: '#FCE7F3', 500: '#EC4899', 600: '#DB2777',
  },
  indigo: {
    50: '#EEF2FF', 100: '#E0E7FF', 500: '#6366F1', 600: '#4F46E5',
  },
  teal: {
    50: '#F0FDFA', 100: '#CCFBF1', 500: '#14B8A6', 600: '#0D9488',
  },
  cyan: {
    50: '#ECFEFF', 100: '#CFFAFE', 500: '#06B6D4', 600: '#0891B2',
  },
  emerald: {
    50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669',
  },
  rose: {
    50: '#FFF1F2', 100: '#FFE4E6', 500: '#F43F5E', 600: '#E11D48',
  },
  stone: {
    50: '#FAFAF9', 100: '#F5F5F4', 500: '#78716C', 800: '#292524', 900: '#1C1917',
  },
  neutral: {
    50: '#FAFAFA', 100: '#F5F5F5', 500: '#737373', 800: '#262626', 900: '#171717',
  },
  zinc: {
    50: '#FAFAFA', 100: '#F4F4F5', 500: '#71717A', 800: '#27272A', 900: '#18181B',
  },
};

const TAILWIND_CLASS_RE = /(?:^|[\s"'`:\[])(?:hover:|focus:|active:|dark:)?((?:bg|text|border|from|to|via|ring|fill|stroke|outline|decoration|shadow|accent))-([a-z]+)(?:-(\d{2,3}))?(?=[\s"'`\]>]|$)/gi;

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;

function normalizeHex(hex: string): string {
  let value = hex.replace('#', '').toUpperCase();
  if (value.length === 3) {
    value = value.split('').map((c) => c + c).join('');
  }
  if (value.length === 8) {
    value = value.slice(0, 6);
  }
  return `#${value}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function tailwindToHex(name: string, shade?: string): string | null {
  const palette = TAILWIND_COLORS[name];
  if (!palette) return null;
  if (shade) {
    const num = parseInt(shade, 10);
    return palette[num] ?? null;
  }
  return palette.DEFAULT ?? null;
}

function hexToHsl(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return [h, s, l];
}

function hueDistance(a: string, b: string): number {
  const [h1, s1] = hexToHsl(a);
  const [h2, s2] = hexToHsl(b);
  if (s1 < 0.08 && s2 < 0.08) return 0;
  let diff = Math.abs(h1 - h2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

function pickTopColors(counts: Map<string, number>, limit: number): string[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const picked: string[] = [];

  for (const [color] of sorted) {
    if (picked.length >= limit) break;
    const tooSimilar = picked.some((existing) => hueDistance(existing, color) < 18);
    if (!tooSimilar) picked.push(color);
  }

  if (picked.length < limit) {
    for (const [color] of sorted) {
      if (picked.length >= limit) break;
      if (!picked.includes(color)) picked.push(color);
    }
  }

  return picked.slice(0, limit);
}

function recordColor(counts: Map<string, number>, color: string | null, weight = 1) {
  if (!color) return;
  const normalized = normalizeHex(color);
  counts.set(normalized, (counts.get(normalized) ?? 0) + weight);
}

function extractTailwindColors(html: string, counts: Map<string, number>) {
  for (const match of html.matchAll(TAILWIND_CLASS_RE)) {
    const prefix = match[1];
    const colorName = match[2].toLowerCase();
    const shade = match[3];
    const hex = tailwindToHex(colorName, shade);
    if (!hex) continue;

    let weight = 1;
    if (prefix === 'text' || prefix === 'bg') weight = 2;
    if (shade && parseInt(shade, 10) >= 500 && parseInt(shade, 10) <= 700) weight = 4;
    if (shade && parseInt(shade, 10) >= 900) weight = 3;

    counts.set(hex, (counts.get(hex) ?? 0) + weight);
  }
}

function extractInlineColors(html: string, counts: Map<string, number>) {
  for (const match of html.matchAll(HEX_RE)) {
    recordColor(counts, match[0]);
  }

  for (const match of html.matchAll(RGB_RE)) {
    recordColor(counts, rgbToHex(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)));
  }
}

function extractMetaColors(html: string, counts: Map<string, number>) {
  const themeColor = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i);
  if (themeColor?.[1]?.startsWith('#')) {
    recordColor(counts, themeColor[1]);
  }
}

async function extractStylesheetColors(html: string, baseUrl: string, counts: Map<string, number>) {
  const hrefs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi)]
    .map((match) => {
      try {
        return new URL(match[1], baseUrl).href;
      } catch {
        return null;
      }
    })
    .filter((href): href is string => !!href)
    .slice(0, 2);

  await Promise.all(
    hrefs.map(async (href) => {
      try {
        const res = await fetch(href, { headers: { 'User-Agent': 'ArtStyleFinder/1.0' } });
        if (!res.ok) return;
        const css = await res.text();
        for (const match of css.matchAll(HEX_RE)) {
          recordColor(counts, match[0]);
        }
        for (const match of css.matchAll(RGB_RE)) {
          recordColor(counts, rgbToHex(parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)));
        }
      } catch {
        // ignore stylesheet fetch failures
      }
    })
  );
}

export async function extractLandingPageColors(html: string, baseUrl: string): Promise<string[]> {
  const counts = new Map<string, number>();

  extractTailwindColors(html, counts);
  extractInlineColors(html, counts);
  extractMetaColors(html, counts);
  await extractStylesheetColors(html, baseUrl, counts);

  const colors = pickTopColors(counts, 5);
  return colors.length > 0 ? colors : [];
}
