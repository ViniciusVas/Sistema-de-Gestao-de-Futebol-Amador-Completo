import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "/api";

// Axios instance sem cabeçalho Authorization — para endpoints públicos (RF65)
const publicApi = axios.create({ baseURL: BASE });

export default publicApi;
