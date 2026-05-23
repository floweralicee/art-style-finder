const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/artchive';

/** Prefix a path with the Next.js basePath (e.g. /artchive). */
export function withBasePath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${normalized}`;
}
