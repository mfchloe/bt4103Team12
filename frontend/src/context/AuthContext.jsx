import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsonRequest } from "../api/httpClient";

const STORAGE_KEY = "auth:session";

const AuthContext = createContext(undefined);

const initialSession = {
  user: null,
  accessToken: null,
  refreshToken: null,
};

const storeSession = (session) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn("Failed to persist auth session", err);
  }
};

const clearStoredSession = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear auth session", err);
  }
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(initialSession);
  const [loading, setLoading] = useState(true);

  const setSessionFromResponse = useCallback((payload) => {
    const next = {
      user: payload.user ?? payload,
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token,
    };
    setSession(next);
    storeSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    setSession(initialSession);
    clearStoredSession();
  }, []);

  const refreshTokens = useCallback(async () => {
    if (!session.refreshToken) {
      throw new Error("Missing refresh token");
    }
    const data = await jsonRequest("/api/auth/refresh", {
      method: "POST",
      body: { refresh_token: session.refreshToken },
    });
    return setSessionFromResponse(data);
  }, [session.refreshToken, setSessionFromResponse]);

  const authFetch = useCallback(
    async (path, options = {}) => {
      if (!session.accessToken) {
        throw new Error("Not authenticated");
      }

      try {
        return await jsonRequest(path, {
          ...options,
          token: session.accessToken,
        });
      } catch (error) {
        if (error.status === 401 && session.refreshToken) {
          const refreshed = await refreshTokens();
          return jsonRequest(path, {
            ...options,
            token: refreshed.accessToken,
          });
        }
        throw error;
      }
    },
    [session.accessToken, session.refreshToken, refreshTokens]
  );

  const login = useCallback(
    async (email, password) => {
      const data = await jsonRequest("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      return setSessionFromResponse(data);
    },
    [setSessionFromResponse]
  );

  const register = useCallback(
    async (payload) => {
      const data = await jsonRequest("/api/auth/register", {
        method: "POST",
        body: payload,
      });
      return setSessionFromResponse(data);
    },
    [setSessionFromResponse]
  );

  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          return;
        }
        const parsed = JSON.parse(raw);
        if (!parsed?.accessToken || !parsed?.refreshToken) {
          clearStoredSession();
          return;
        }
        setSession(parsed);
        try {
          const profile = await jsonRequest("/api/auth/me", { token: parsed.accessToken });
          if (isMounted) {
            setSession((prev) => {
              const next = { ...prev, user: profile };
              storeSession(next);
              return next;
            });
          }
        } catch (error) {
          if (error.status === 401 && parsed.refreshToken) {
            try {
              const refreshed = await jsonRequest("/api/auth/refresh", {
                method: "POST",
                body: { refresh_token: parsed.refreshToken },
              });
              if (isMounted) {
                setSessionFromResponse(refreshed);
              }
            } catch (refreshError) {
              console.warn("Failed to refresh token during bootstrap", refreshError);
              if (isMounted) {
                logout();
              }
            }
          } else if (isMounted) {
            logout();
          }
        }
      } catch (err) {
        console.warn("Failed to restore auth session", err);
        logout();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();
    return () => {
      isMounted = false;
    };
  }, [logout, setSessionFromResponse]);

  const value = useMemo(
    () => ({
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      isAuthenticated: Boolean(session.user && session.accessToken),
      loading,
      login,
      register,
      logout,
      refreshTokens,
      authFetch,
      setUser: (user) => {
        setSession((prev) => {
          const next = { ...prev, user };
          storeSession(next);
          return next;
        });
      },
    }),
    [
      session.user,
      session.accessToken,
      session.refreshToken,
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
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
