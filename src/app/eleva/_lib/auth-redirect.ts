const ELEVA_DESTINATION = '/eleva/dashboard';

export function getSafeNextPath(path: string | null, fallback = ELEVA_DESTINATION): string {
  if (!path) return fallback;
  if (!path.startsWith('/')) return fallback;
  if (path.startsWith('//')) return fallback;
  if (path.includes('://')) return fallback;
  if (path !== '/eleva' && !path.startsWith('/eleva/')) return fallback;
  return path;
}
