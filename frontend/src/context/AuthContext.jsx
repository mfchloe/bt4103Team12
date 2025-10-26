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
  // firebase-backed user session
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // dataset-backed customer session  (far-trans database)
  const [farCustomerSession, setFarCustomerSession] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem("farCustomerSession");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // ---- Login: Email/Password version ----
  const login = useCallback(async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const token = await getIdToken(userCredential.user, true);

    // clear datasetSession if we were previously in dataset mode
    setFarCustomerSession(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("farCustomerSession");
    }

    setUser(userCredential.user);
    setAccessToken(token);
    return userCredential.user;
  }, []);

  // ---- Login: Far-trans dataset version ----
  const farCustomerLogin = useCallback(async (customerId) => {
    const res = await fetch(`${apiBaseUrl}/api/auth/far-customer-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customerId })
    });

    const payloadText = await res.text();
    let payload = null;
    if (payloadText) {
      try {
        payload = JSON.parse(payloadText);
      } catch {
        throw new Error(
          `Unexpected response from server (status ${res.status})`
        );
      }
    }

    if (!res.ok) {
      throw new Error(payload?.detail || payload?.message || "Invalid Customer ID");
    }

    const newSession = {
      mode: payload.mode || "dataset",
      customerId: payload.customer_id,
      accessToken: payload.access_token
    };

    setUser(null);
    setAccessToken(null);

    setFarCustomerSession(newSession);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "farCustomerSession",
        JSON.stringify(newSession)
      );
    }
    return newSession;
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

    setFarCustomerSession(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("farCustomerSession");
    }
    setUser(userCredential.user);
    setAccessToken(token);

    return userCredential.user;
  }, []);

  // ---- Logout ----
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {
      //ignore if already signed out
    }
    setUser(null);
    setAccessToken(null);
    setFarCustomerSession(null);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem("farCustomerSession");
    } 
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

    const getActiveToken = async () =>  {
      if (farCustomerSession?.accessToken) {
        return farCustomerSession.accessToken;
      }
      if (!auth.currentUser) {
        const err = new Error("Not authenticated");
        err.status = 401;
        throw err;
      }
      return getIdToken(auth.currentUser, false);
    };

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
        } catch {
          const friendly = new Error("Received unexpected response from server.");
          friendly.status = response.status;
          friendly.raw = text;
          throw friendly;
        }
      }

      return { response, payload };
    };

    const tokenToUse = await getActiveToken();
    let { response, payload } = await performRequest(tokenToUse);

    if (response.status === 401 && !farCustomerSession?.accessToken) {
      const refreshedToken = await getIdToken(auth.currentUser, true).catch(() => null);
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
  }, [farCustomerSession]);

  // ---- Restore session (Firebase handles persistence automatically) ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await getIdToken(firebaseUser, false);
        setUser(firebaseUser);
        setAccessToken(token);

        setFarCustomerSession(null);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem("farCustomerSession");
        }
      } else {
        let restored = null;
        if (typeof window !== "undefined") {
          try {
            const raw = window.sessionStorage.getItem("farCustomerSession");
            restored = raw ? JSON.parse(raw) : null;
          } catch {
            restored = null;
          }
        }
        if (restored && restored.accessToken) {
          setFarCustomerSession(restored);
          setUser(null);
          setAccessToken(null);
        } else {
          setFarCustomerSession(null);
          setUser(null);
          setAccessToken(null);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);


  const isFarCustomer = Boolean(farCustomerSession?.accessToken);
  const isFirebaseUser = Boolean(user && accessToken);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      farCustomerSession,
      loading,
      isFarCustomer,
      isFirebaseUser,
      isAuthenticated: isFarCustomer || isFirebaseUser,
      login,
      register,
      farCustomerLogin,
      logout,
      refreshTokens,
      authFetch,
      setUser,
    }),
    [
      user,
      accessToken,
      farCustomerSession,
      loading,
      isFarCustomer,
      isFirebaseUser,
      login,
      register,
      farCustomerLogin,
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
