import { useEffect } from 'react';
import { normalizeApiBaseUrl } from '../api';

const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes

/**
 * Pings the backend keep-alive endpoint periodically while this hook is
 * mounted. Keeps the Render free-tier server from sleeping during active
 * sessions. Errors are silently ignored (cold start / sleeping server).
 */
export function useKeepAlive() {
  useEffect(() => {
    const ping = () => {
      const base = normalizeApiBaseUrl(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1');
      fetch(`${base}/ping`, { method: 'GET' }).catch(() => {
        /* silently ignore if backend is already sleeping */
      });
    };

    // Ping immediately on mount
    ping();

    const interval = setInterval(ping, KEEP_ALIVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}