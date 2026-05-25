export const MOOD_KEYWORDS: Record<string, string[]> = {
  melancholy: ['nocturne', 'shadow', 'solitude', 'dark', 'figure'],
  minimal: ['sketch', 'line', 'simple', 'geometric', 'white'],
  warm: ['golden', 'sunlight', 'amber', 'harvest', 'fire'],
  cool: ['blue', 'ice', 'mist', 'water', 'twilight'],
  electric: ['vivid', 'bold', 'colour', 'abstract', 'dynamic'],
  dark: ['night', 'shadow', 'black', 'noir', 'chiaroscuro'],
  light: ['bright', 'daylight', 'white', 'airy', 'luminous'],
  bold: ['dramatic', 'strong', 'contrast', 'heroic', 'vivid'],
  soft: ['pastel', 'gentle', 'delicate', 'haze', 'blush'],
  geometric: ['grid', 'pattern', 'shape', 'modern', 'abstract'],
  floral: ['flower', 'botanical', 'garden', 'bloom', 'petal'],
  portrait: ['portrait', 'face', 'figure', 'head', 'likeness'],
  landscape: ['landscape', 'horizon', 'nature', 'field', 'sky'],
  abstract: ['abstract', 'form', 'colour', 'composition', 'modern'],
  watercolor: ['watercolor', 'wash', 'botanical', 'delicate', 'ink'],
  ink: ['ink', 'drawing', 'line', 'calligraphy', 'monochrome'],
  gold: ['gold', 'gilded', 'amber', 'luxury', 'ornament'],
  blue: ['blue', 'azure', 'indigo', 'cerulean', 'navy'],
  red: ['red', 'crimson', 'scarlet', 'ruby', 'vermillion'],
  monochrome: ['black', 'white', 'grey', 'grisaille', 'ink'],
  vintage: ['antique', 'heritage', 'classic', 'old', 'patina'],
  modern: ['modern', 'contemporary', 'abstract', 'minimal', 'graphic'],
  romantic: ['love', 'tender', 'dream', 'soft', 'ideal'],
  dramatic: ['dramatic', 'theatrical', 'storm', 'heroic', 'contrast'],
  peaceful: ['calm', 'serene', 'quiet', 'pastoral', 'still'],
  chaotic: ['storm', 'crowd', 'battle', 'dynamic', 'energy'],
  earthy: ['earth', 'brown', 'clay', 'soil', 'terracotta'],
  pastel: ['pastel', 'soft', 'pale', 'blush', 'light'],
  vivid: ['vivid', 'bright', 'saturated', 'colourful', 'bold'],
  gothic: ['gothic', 'dark', 'medieval', 'cathedral', 'shadow'],
  moody: ['moody', 'atmospheric', 'twilight', 'shadow', 'mist'],
  serene: ['serene', 'calm', 'lake', 'quiet', 'mist'],
  rustic: ['rustic', 'farm', 'wood', 'harvest', 'country'],
  elegant: ['elegant', 'refined', 'grace', 'silk', 'court'],
  playful: ['playful', 'colourful', 'festival', 'dance', 'joy'],
  mystical: ['mystical', 'dream', 'spirit', 'night', 'glow'],
  industrial: ['industrial', 'steel', 'factory', 'urban', 'machine'],
  tropical: ['tropical', 'palm', 'sun', 'vivid', 'paradise'],
  winter: ['winter', 'snow', 'ice', 'cold', 'frost'],
  summer: ['summer', 'sun', 'harvest', 'field', 'warm'],
  autumn: ['autumn', 'fall', 'amber', 'harvest', 'leaf'],
  spring: ['spring', 'bloom', 'garden', 'fresh', 'green'],
  japanese: ['japanese', 'ukiyo', 'ink', 'scroll', 'nature'],
  renaissance: ['renaissance', 'classical', 'figure', 'gold', 'fresco'],
  impressionist: ['impressionist', 'light', 'brush', 'garden', 'colour'],
  surreal: ['surreal', 'dream', 'fantasy', 'strange', 'symbol'],
  baroque: ['baroque', 'dramatic', 'gold', 'ornate', 'figure'],
  noir: ['noir', 'shadow', 'night', 'urban', 'mystery'],
  ethereal: ['ethereal', 'light', 'mist', 'angel', 'dream'],
};

export type MoodProfile = {
  temperature: 'warm' | 'cool' | 'neutral';
  saturation: 'vivid' | 'muted' | 'balanced';
  lightness: 'light' | 'dark' | 'balanced';
};

const TEMPERATURE_MOODS: Record<'warm' | 'cool' | 'neutral', string[]> = {
  warm: ['warm', 'gold', 'red', 'romantic', 'summer', 'autumn', 'earthy', 'rustic', 'tropical'],
  cool: ['cool', 'blue', 'winter', 'serene', 'peaceful', 'ethereal', 'mystical'],
  neutral: ['minimal', 'monochrome', 'modern', 'geometric', 'vintage'],
};

const SATURATION_MOODS: Record<'vivid' | 'muted' | 'balanced', string[]> = {
  vivid: ['vivid', 'electric', 'bold', 'chaotic', 'tropical', 'playful'],
  muted: ['soft', 'pastel', 'melancholy', 'peaceful', 'vintage', 'ethereal'],
  balanced: [],
};

const LIGHTNESS_MOODS: Record<'light' | 'dark' | 'balanced', string[]> = {
  light: ['light', 'pastel', 'spring', 'summer', 'ethereal', 'peaceful'],
  dark: ['dark', 'melancholy', 'gothic', 'noir', 'dramatic', 'winter'],
  balanced: [],
};

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[\s,./\-_]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function countMoodHits(tokens: string[], moods: string[]): number {
  let hits = 0;
  for (const token of tokens) {
    if (moods.includes(token)) hits += 1;
  }
  for (const mood of moods) {
    if (tokens.some((t) => t.includes(mood) || mood.includes(t))) hits += 1;
  }
  return hits;
}

function pickDominant<T extends string>(
  scores: Record<T, number>,
  fallback: T
): T {
  const entries = Object.entries(scores) as [T, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][1] > 0 ? entries[0][0] : fallback;
}

export function translateMoodToKeywords(input: string): string[] {
  const normalized = input.toLowerCase().trim();
  if (!normalized) return [];

  const tokens = tokenize(normalized);
  const matched = new Set<string>();

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    const moodHit =
      tokens.includes(mood) ||
      normalized.includes(mood) ||
      tokens.some((t) => mood.includes(t) && t.length >= 4);

    if (moodHit) {
      keywords.forEach((k) => matched.add(k));
    }
  }

  if (matched.size > 0) {
    return [...matched].slice(0, 5);
  }

  return [normalized];
}

export function inferMoodProfile(input: string): MoodProfile {
  const tokens = tokenize(input);

  const temperatureScores = {
    warm: countMoodHits(tokens, TEMPERATURE_MOODS.warm),
    cool: countMoodHits(tokens, TEMPERATURE_MOODS.cool),
    neutral: countMoodHits(tokens, TEMPERATURE_MOODS.neutral),
  };

  const saturationScores = {
    vivid: countMoodHits(tokens, SATURATION_MOODS.vivid),
    muted: countMoodHits(tokens, SATURATION_MOODS.muted),
    balanced: 0,
  };

  const lightnessScores = {
    light: countMoodHits(tokens, LIGHTNESS_MOODS.light),
    dark: countMoodHits(tokens, LIGHTNESS_MOODS.dark),
    balanced: 0,
  };

  return {
    temperature: pickDominant(temperatureScores, 'neutral'),
    saturation: pickDominant(saturationScores, 'balanced'),
    lightness: pickDominant(lightnessScores, 'balanced'),
  };
}
