import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("organizer_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const token = localStorage.getItem("organizer_token");
    // Only redirect if it's a real 401 and the user was supposedly logged in via server (jwt)
    if (error.response?.status === 401 && token && !token.startsWith("local-token-")) {
      console.warn("Unauthorized! Clearing token and redirecting...");
      localStorage.removeItem("organizer_token");
      localStorage.removeItem("organizer_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
