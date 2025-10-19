import { useEffect, useRef, useState } from "react";

const safeParse = (value, fallback) => {
  try {
    return value === null || value === undefined ? fallback : JSON.parse(value);
  } catch (err) {
    console.warn("Failed to parse sessionStorage value", err);
    return fallback;
  }
};

/**
 * React state synced with sessionStorage so the value survives navigation.
 * Falls back gracefully if sessionStorage is unavailable (SSR or disabled).
 */
export const useSessionStorageState = (key, defaultValue) => {
  const isBrowser = typeof window !== "undefined";
  const defaultValueRef = useRef(defaultValue);

  const [state, setState] = useState(() => {
    if (!isBrowser) return defaultValueRef.current;
    return safeParse(window.sessionStorage.getItem(key), defaultValueRef.current);
  });

  useEffect(() => {
    if (!isBrowser) return;
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch (err) {
      console.warn(`Failed to write ${key} to sessionStorage`, err);
    }
  }, [key, state, isBrowser]);

  return [state, setState];
};

