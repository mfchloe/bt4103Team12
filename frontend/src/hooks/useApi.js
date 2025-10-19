import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const useApi = (path, body) => {
  const payloadKey = JSON.stringify(body || {});
  const cacheKey = path ? `useApi:${path}:${payloadKey}` : null;
  const [data, setData] = useState(() => {
    if (typeof window === "undefined" || !cacheKey) return null;
    try {
      const cached = window.sessionStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached)?.data ?? null : null;
    } catch (err) {
      console.warn(`Failed to parse cached response for ${path}`, err);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!path) return;
    let ignore = false;
    const hasWindow = typeof window !== "undefined";

    const fetchData = async () => {
      let cachedData = null;
      if (hasWindow && cacheKey) {
        try {
          const cached = window.sessionStorage.getItem(cacheKey);
          if (cached) {
            cachedData = JSON.parse(cached)?.data ?? null;
            if (!ignore && cachedData != null) {
              setData(cachedData);
            }
          }
        } catch (err) {
          console.warn(`Failed to recover cached response for ${path}`, err);
        }
      }

      if (!cachedData) {
        setData(null);
      }

      setLoading(!cachedData);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadKey,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!ignore) setData(json);
        if (hasWindow && cacheKey) {
          try {
            window.sessionStorage.setItem(
              cacheKey,
              JSON.stringify({ data: json, timestamp: Date.now() })
            );
          } catch (err) {
            console.warn(`Failed to cache response for ${path}`, err);
          }
        }
      } catch (err) {
        if (!ignore) setError(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();
    return () => {
      ignore = true;
    };
  }, [path, cacheKey, payloadKey]);

  return { data, loading, error };
};
