export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map((c) => c + c).join('')
    : normalized;

  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

export function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
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

function averageHsl(colors: string[]): [number, number, number] {
  const hslValues = colors.map(hexToHsl);
  const avgHue = hslValues.reduce((sum, [h]) => sum + h, 0) / hslValues.length;
  const avgSat = hslValues.reduce((sum, [, s]) => sum + s, 0) / hslValues.length;
  const avgLight = hslValues.reduce((sum, [, , l]) => sum + l, 0) / hslValues.length;
  return [avgHue, avgSat, avgLight];
}

type Temperature = 'warm' | 'cool' | 'neutral';
type Saturation = 'vivid' | 'muted' | 'balanced';
type Lightness = 'light' | 'dark' | 'balanced';

function classifyTemperature(hue: number, saturation: number): Temperature {
  if (saturation < 0.15) return 'neutral';
  if ((hue >= 0 && hue <= 60) || hue >= 300) return 'warm';
  if (hue >= 180 && hue <= 270) return 'cool';
  return 'neutral';
}

function classifySaturation(saturation: number): Saturation {
  if (saturation > 0.5) return 'vivid';
  if (saturation < 0.3) return 'muted';
  return 'balanced';
}

function classifyLightness(lightness: number): Lightness {
  if (lightness > 0.6) return 'light';
  if (lightness < 0.4) return 'dark';
  return 'balanced';
}

export function deriveDesignRec(colors: string[]): { h: string; b: string } {
  const [hue, saturation, lightness] = averageHsl(colors);
  const temperature = classifyTemperature(hue, saturation);
  const sat = classifySaturation(saturation);
  const light = classifyLightness(lightness);

  if (temperature === 'warm' && sat === 'vivid') {
    return {
      h: 'Expressive, Bold',
      b: 'Lead with saturated warm accents and high-contrast type. Let one hero color carry the energy.',
    };
  }
  if (temperature === 'warm' && sat === 'muted') {
    return {
      h: 'Earthy, Inviting',
      b: 'Layer ochres, terracotta, and cream with soft edges. Feels handcrafted and approachable.',
    };
  }
  if (temperature === 'cool' && sat === 'vivid') {
    return {
      h: 'Electric, Contemporary',
      b: 'Pair crisp cool hues with generous whitespace. Geometric layouts and confident sans-serifs.',
    };
  }
  if (temperature === 'cool' && sat === 'muted') {
    return {
      h: 'Editorial, Calm',
      b: 'Muted blues and slate tones with restrained typography. Quiet hierarchy, lots of breathing room.',
    };
  }
  if (temperature === 'neutral' && light === 'light') {
    return {
      h: 'Minimal, Airy',
      b: 'Soft neutrals as the base, one accent for emphasis. Let imagery and product shots dominate.',
    };
  }
  if (temperature === 'neutral' && light === 'dark') {
    return {
      h: 'Dramatic, Refined',
      b: 'Dark grounds with metallic or ivory highlights. Premium feel through contrast and restraint.',
    };
  }

  return {
    h: 'Balanced, Gallery-Ready',
    b: 'Mix extracted tones evenly across UI chrome and content. Keep layouts clean so color does the talking.',
  };
}


function rgbDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function paletteColorDistance(a: string, b: string): number {
  const [h1, s1, l1] = hexToHsl(a);
  const [h2, s2, l2] = hexToHsl(b);

  let hueDiff = Math.abs(h1 - h2);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;

  const satWeight = Math.max(s1, s2, 0.12);
  const hueScore = (hueDiff / 180) * satWeight;
  const satScore = Math.abs(s1 - s2);
  const lightScore = Math.abs(l1 - l2);

  const rgbScore = rgbDistance(a, b) / 441.67;

  return hueScore * 0.55 + satScore * 0.2 + lightScore * 0.15 + rgbScore * 0.1;
}

export const NEUTRAL_SAT_THRESHOLD = 0.12;
export const HUE_FAMILY_TOLERANCE = 30;

export interface HueSignature {
  id: string;
  label: string;
  hue: number;
  color: string;
}

const FAMILY_LABELS: Record<string, string> = {
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  teal: 'teal',
  blue: 'blue',
  purple: 'purple',
};

function hueWithinTolerance(a: number, b: number, tolerance: number): boolean {
  let diff = Math.abs(a - b);
  if (diff > 180) diff = 360 - diff;
  return diff <= tolerance;
}

function getFamilyId(hue: number, saturation: number): string | null {
  if (saturation < NEUTRAL_SAT_THRESHOLD) return null;
  if (hue >= 345 || hue < 20) return 'red';
  if (hue < 50) return 'orange';
  if (hue < 75) return 'yellow';
  if (hue < 165) return 'green';
  if (hue < 200) return 'teal';
  if (hue < 265) return 'blue';
  return 'purple';
}

function averageLightness(colors: string[]): number {
  if (colors.length === 0) return 0.5;
  return colors.reduce((sum, c) => sum + hexToHsl(c)[2], 0) / colors.length;
}

function averageSaturation(colors: string[]): number {
  const chromatic = colors.filter((c) => hexToHsl(c)[1] >= NEUTRAL_SAT_THRESHOLD);
  const pool = chromatic.length > 0 ? chromatic : colors;
  return pool.reduce((sum, c) => sum + hexToHsl(c)[1], 0) / pool.length;
}

export function getSignatureFamilies(colors: string[], maxFamilies = 2): HueSignature[] {
  const familyMap = new Map<string, { hue: number; color: string; weight: number; peakWeight: number }>();

  colors.forEach((color, index) => {
    const [hue, saturation] = hexToHsl(color);
    const id = getFamilyId(hue, saturation);
    if (!id) return;

    const weight = colors.length - index;
    const existing = familyMap.get(id);
    if (!existing) {
      familyMap.set(id, { hue, color, weight, peakWeight: weight });
      return;
    }

    existing.weight += weight;
    if (weight >= existing.peakWeight) {
      existing.peakWeight = weight;
      existing.hue = hue;
      existing.color = color;
    }
  });

  return [...familyMap.entries()]
    .sort((a, b) => b[1].weight - a[1].weight)
    .slice(0, maxFamilies)
    .map(([id, { hue, color }]) => ({
      id,
      label: FAMILY_LABELS[id] ?? id,
      hue,
      color,
    }));
}

export function artworkHasRequiredFamilies(
  artworkColors: string[],
  signatures: HueSignature[],
  tolerance = HUE_FAMILY_TOLERANCE
): boolean {
  if (signatures.length === 0) return true;

  return signatures.every((signature) =>
    artworkColors.some((color) => {
      const [hue, saturation] = hexToHsl(color);
      if (saturation < 0.08) return false;
      return hueWithinTolerance(hue, signature.hue, tolerance);
    })
  );
}

function scoreNeutralPaletteMatch(
  artworkColors: string[],
  websiteColors: string[]
): { score: number; suggestion: string } {
  const webLight = averageLightness(websiteColors);
  const artLight = averageLightness(artworkColors);
  const lightDiff = Math.abs(webLight - artLight);
  const score = Math.max(40, Math.min(100, Math.round(100 - lightDiff * 120)));

  if (lightDiff < 0.15) {
    return {
      score,
      suggestion: 'Both palettes are neutral — matched on similar light and dark balance.',
    };
  }

  return {
    score,
    suggestion: 'Neutral site palette — this work complements your muted, tone-on-tone layout.',
  };
}

export function scoreFamilyMatch(
  artworkColors: string[],
  websiteColors: string[],
  signatures: HueSignature[]
): { score: number; suggestion: string } {
  if (signatures.length === 0) {
    return scoreNeutralPaletteMatch(artworkColors, websiteColors);
  }

  const webLight = averageLightness(websiteColors);
  const artLight = averageLightness(artworkColors);
  const webSat = averageSaturation(websiteColors);
  const artSat = averageSaturation(artworkColors);

  const lightScore = 1 - Math.min(1, Math.abs(webLight - artLight) / 0.45);
  const satScore = 1 - Math.min(1, Math.abs(webSat - artSat) / 0.5);
  const score = Math.max(
    55,
    Math.min(100, Math.round(68 + lightScore * 22 + satScore * 10))
  );

  const familyNames = signatures.map((s) => s.label);
  const familyText =
    familyNames.length === 1
      ? `${familyNames[0]} tones`
      : `${familyNames.slice(0, -1).join(', ')} and ${familyNames[familyNames.length - 1]} tones`;

  return {
    score,
    suggestion: `Shares your ${familyText} — a strong color-family match with this piece.`,
  };
}

export function matchWebsiteToArtwork(
  artworkColors: string[],
  websiteColors: string[]
): {
  score: number;
  suggestion: string;
  passesFilter: boolean;
  signatures: HueSignature[];
} {
  const signatures = getSignatureFamilies(websiteColors);
  const passesFilter = artworkHasRequiredFamilies(artworkColors, signatures);

  if (!passesFilter) {
    return { score: 0, suggestion: '', passesFilter: false, signatures };
  }

  const { score, suggestion } = scoreFamilyMatch(artworkColors, websiteColors, signatures);
  return { score, suggestion, passesFilter: true, signatures };
}

export function comparePalettes(
  artworkColors: string[],
  websiteColors: string[]
): { score: number; suggestion: string } {
  const artwork = artworkColors.slice(0, 5);
  const website = websiteColors.slice(0, 5);

  if (artwork.length === 0 || website.length === 0) {
    return { score: 0, suggestion: 'Unable to compare palettes — try a different URL.' };
  }

  let totalDistance = 0;
  for (const artworkColor of artwork) {
    let minDistance = Infinity;
    for (const websiteColor of website) {
      minDistance = Math.min(minDistance, paletteColorDistance(artworkColor, websiteColor));
    }
    totalDistance += minDistance;
  }

  const avgDistance = totalDistance / artwork.length;
  const score = Math.max(0, Math.min(100, Math.round((1 - avgDistance) * 100)));

  const [artHue, artSat] = averageHsl(artwork);
  const [webHue, webSat] = averageHsl(website);
  const artTemp = classifyTemperature(artHue, artSat);
  const webTemp = classifyTemperature(webHue, webSat);
  const artSatClass = classifySaturation(artSat);
  const hueGap = Math.min(Math.abs(artHue - webHue), 360 - Math.abs(artHue - webHue));

  if (score >= 75 && hueGap < 45) {
    return {
      score,
      suggestion: 'Your site palette aligns closely with this artwork — a natural, cohesive pairing.',
    };
  }
  if (score >= 55 && artTemp === webTemp) {
    return {
      score,
      suggestion: `Shared ${artTemp} tones create a harmonious bridge between your brand and this piece.`,
    };
  }
  if (score >= 55) {
    return {
      score,
      suggestion: 'Moderate overlap — use this work as a featured accent within your existing layout.',
    };
  }
  if (artTemp !== webTemp && artSatClass === 'vivid') {
    return {
      score,
      suggestion: 'High contrast — this vivid piece would anchor and energize your site layout.',
    };
  }
  if (artTemp === 'cool' && webTemp === 'cool') {
    return {
      score,
      suggestion: "Your site's cool tones complement this work's muted blues well.",
    };
  }
  if (artTemp === 'warm' && webTemp === 'cool') {
    return {
      score,
      suggestion: 'Warm artwork against cool site tones — use sparingly for striking focal points.',
    };
  }

  return {
    score,
    suggestion: 'Distinct palettes — let this artwork stand alone as a bold visual statement.',
  };
}

export function extractOgImageUrl(html: string, baseUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      try {
        return new URL(match[1], baseUrl).href;
      } catch {
        return match[1];
      }
    }
  }

  return null;
}
