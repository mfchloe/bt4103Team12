// src/context/AuthContext.jsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  getIdToken,
} from "firebase/auth";
import { auth } from "../../firebase";
import { apiBaseUrl } from "../api/httpClient.js";
const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---- Login ----
  const login = useCallback(async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const token = await getIdToken(userCredential.user, true);
    setUser(userCredential.user);
    setAccessToken(token);
    return userCredential.user;
  }, []);

  // ---- Register ----
  const register = useCallback(async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    const token = await getIdToken(userCredential.user, true);
    setUser(userCredential.user);
    setAccessToken(token);
    return userCredential.user;
  }, []);

  // ---- Logout ----
  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setAccessToken(null);
  }, []);

  // ---- Refresh token (Firebase handles automatically, but we can force refresh) ----
  const refreshTokens = useCallback(async () => {
    if (!auth.currentUser) throw new Error("No user to refresh");
    const token = await getIdToken(auth.currentUser, true);
    setAccessToken(token);
    return token;
  }, []);

  // ---- Protected fetch helper ----
  const authFetch = useCallback(async (path, options = {}) => {
    const buildUrl = (maybeRelative) =>
      /^https?:\/\//i.test(maybeRelative)
        ? maybeRelative
        : `${apiBaseUrl}${maybeRelative}`;

    const serializeBody = (bodyValue, headers) => {
      if (!bodyValue) return undefined;
      if (bodyValue instanceof FormData) return bodyValue;
      if (typeof bodyValue === "string") return bodyValue;
      headers.set("Content-Type", "application/json");
      return JSON.stringify(bodyValue);
    };

    const performRequest = async (tokenValue) => {
      const headers = new Headers(options.headers || {});
      headers.set("Authorization", `Bearer ${tokenValue}`);

      const requestInit = {
        ...options,
        headers,
        body: serializeBody(options.body, headers),
      };

      const response = await fetch(buildUrl(path), requestInit);
      const text = await response.text();
      let payload = null;

      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (parseError) {
          const friendly = new Error("Received unexpected response from server.");
          friendly.status = response.status;
          friendly.raw = text;
          throw friendly;
        }
      }

      return { response, payload };
    };

    const ensureToken = async (forceRefresh = false) => {
      if (!auth.currentUser) {
        const error = new Error("Not authenticated");
        error.status = 401;
        throw error;
      }
      return getIdToken(auth.currentUser, forceRefresh);
    };

    const initialToken = await ensureToken(false);

    let { response, payload } = await performRequest(initialToken);

    if (response.status === 401) {
      const refreshedToken = await ensureToken(true).catch(() => null);
      if (!refreshedToken) {
        const error = new Error("Session expired. Please log in again.");
        error.status = 401;
        throw error;
      }
      ({ response, payload } = await performRequest(refreshedToken));
    }

    if (!response.ok) {
      const error = new Error(
        payload?.detail || payload?.message || `Request failed: ${response.status}`
      );
      error.status = response.status;
      error.payload = payload;

      throw error;
    }

    return payload;
  }, []);

  // ---- Restore session (Firebase handles persistence automatically) ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await getIdToken(firebaseUser, false);
        setUser(firebaseUser);
        setAccessToken(token);
      } else {
        setUser(null);
        setAccessToken(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: Boolean(user),
      loading,
      login,
      register,
      logout,
      refreshTokens,
      authFetch,
      setUser,
    }),
    [
      user,
      accessToken,
      loading,
      login,
      register,
      logout,
      refreshTokens,
      authFetch,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
