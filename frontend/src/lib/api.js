import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API, timeout: 20000 });

export const fetchLive = () => api.get("/live").then((r) => r.data);
export const fetchHistory = (hours) =>
    api.get("/history", { params: { hours } }).then((r) => r.data);
export const fetchSettings = () => api.get("/settings").then((r) => r.data);
export const saveSettings = (payload) =>
    api.post("/settings", payload).then((r) => r.data);
export const seedHistory = (hours = 24) =>
    api.post(`/history/seed`, null, { params: { hours } }).then((r) => r.data);
export const clearHistory = () => api.delete("/history").then((r) => r.data);
