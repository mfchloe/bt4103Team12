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
    const token = await getIdToken(auth.currentUser || {}, false);
    if (!token) throw new Error("Not authenticated");

    const res = await fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 401) {
      // try one refresh
      const refreshed = await getIdToken(auth.currentUser, true);
      const retry = await fetch(path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${refreshed}`,
          "Content-Type": "application/json",
        },
      });
      if (!retry.ok) throw new Error(`Request failed: ${retry.status}`);
      return retry.json();
    }

    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
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
