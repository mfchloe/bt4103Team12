import { useEffect, useRef, useState } from "react";

const safeParse = (value, fallback) => {
  try {
    return value === null || value === undefined ? fallback : JSON.parse(value);
  } catch (err) {
    console.warn("Failed to parse localStorage value", err);
    return fallback;
  }
};

/**
 * React state synced with localStorage so the value survives browser restarts.
 * Falls back gracefully if localStorage is unavailable (SSR or disabled).
 */
export const useLocalStorageState = (key, defaultValue) => {
  const isBrowser = typeof window !== "undefined";
  const defaultValueRef = useRef(defaultValue);

  const [state, setState] = useState(() => {
    if (!isBrowser) return defaultValueRef.current;
    return safeParse(window.localStorage.getItem(key), defaultValueRef.current);
  });

  useEffect(() => {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn(`Failed to write ${key} to localStorage`, err);
    }
  }, [key, state, isBrowser]);

  useEffect(() => {
    if (!isBrowser) return;

    const handleStorage = (event) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== key) return;
      setState(safeParse(event.newValue, defaultValueRef.current));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [key, isBrowser]);

  return [state, setState];
};

