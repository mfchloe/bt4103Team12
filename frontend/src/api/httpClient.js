const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const buildUrl = (path) => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
};

export const jsonRequest = async (path, { method = "GET", headers = {}, body, token, signal } = {}) => {
  const requestHeaders = new Headers({
    "Content-Type": "application/json",
    ...headers,
  });

  if (token) {
    requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  let payload;
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.message || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const apiBaseUrl = API_BASE;

