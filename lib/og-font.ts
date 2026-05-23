let frauncesBoldCache: ArrayBuffer | null = null;

export async function loadFrauncesBold(): Promise<ArrayBuffer> {
  if (frauncesBoldCache) return frauncesBoldCache;

  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap',
    { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Artchive/1.0)' } }
  ).then((res) => res.text());

  const match = css.match(/url\((https:\/\/fonts\.gstatic\.com[^)]+)\)/);
  if (!match?.[1]) {
    throw new Error('Could not resolve Fraunces font URL');
  }

  const fontData = await fetch(match[1]).then((res) => res.arrayBuffer());
  frauncesBoldCache = fontData;
  return fontData;
}
