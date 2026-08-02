import api from '../api';

// Backend stores a relative path (e.g. /uploads/profiles/<file>). Resolve it
// against the API origin so it works regardless of the configured VITE_API_URL.
export function resolveAssetUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const origin = new URL(api.defaults.baseURL ?? 'http://localhost:8000').origin;
  return `${origin}${path}`;
}
