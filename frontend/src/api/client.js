import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const createInteraction = (payload) =>
  client.post("/interactions", payload).then((res) => res.data);

export const listInteractions = () =>
  client.get("/interactions").then((res) => res.data);

export const updateInteraction = (id, payload) =>
  client.put(`/interactions/${id}`, payload).then((res) => res.data);

export const deleteInteraction = (id) =>
  client.delete(`/interactions/${id}`).then((res) => res.data);

export const logViaChat = (message) =>
  client.post("/interactions/chat", { message }).then((res) => res.data);

export const runAgentTool = (input, action) =>
  client.post("/agent/run", { input, action }).then((res) => res.data);

export default client;
