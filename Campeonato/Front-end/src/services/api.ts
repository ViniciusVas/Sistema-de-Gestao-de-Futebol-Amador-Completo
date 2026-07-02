import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({ baseURL: BASE });

// Uma única Promise de refresh compartilhada — evita múltiplos refreshes simultâneos
let refreshPromise: Promise<string> | null = null;

const tryRefreshToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  const refresh = localStorage.getItem("organizer_refresh");
  if (!refresh) return Promise.reject(new Error("sem refresh token"));

  refreshPromise = axios
    .post(`${BASE}/token/refresh/`, { refresh })
    .then((res) => {
      const newAccess: string = res.data.access;
      localStorage.setItem("organizer_token", newAccess);
      if (res.data.refresh) {
        localStorage.setItem("organizer_refresh", res.data.refresh);
      }
      return newAccess;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("organizer_token");
  if (token && !token.startsWith("local-token-")) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error.config;
    const token = localStorage.getItem("organizer_token");
    const isRealJwt = token && !token.startsWith("local-token-");

    // Só tenta refresh em 401 com token real e apenas uma vez por request
    if (error.response?.status === 401 && isRealJwt && !config._retry) {
      config._retry = true;
      try {
        const newToken = await tryRefreshToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        return api(config);
      } catch {
        // Refresh falhou — limpa sessão e vai para login
        localStorage.removeItem("organizer_token");
        localStorage.removeItem("organizer_refresh");
        localStorage.removeItem("organizer_user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
