import { api, getToken, setToken } from "./api.js";

let currentUser = null;

async function fetchMe() {
  try {
    const user = await api.get("/api/auth/me");
    currentUser = user;
    return user;
  } catch {
    currentUser = null;
    setToken(null);
    return null;
  }
}

export async function registerUser(username, password, role = "user") {
  try {
    const result = await api.post("/api/auth/register", { username, password, role });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function loginUser(username, password) {
  try {
    const result = await api.post("/api/auth/login", { username, password });
    setToken(result.token);
    currentUser = result.user;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function logoutUser() {
  setToken(null);
  currentUser = null;
}

export function getCurrentUser() {
  return currentUser;
}

export function isLoggedIn() {
  return !!currentUser || !!getToken();
}

export function isAdmin() {
  return currentUser?.role === "admin";
}

export async function getAllUsers() {
  try {
    return await api.get("/api/auth/users");
  } catch {
    return [];
  }
}

export async function deleteUser(username) {
  try {
    await api.del(`/api/auth/users/${username}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function resetUserPassword(username, newPassword) {
  try {
    await api.post(`/api/auth/users/${username}/reset-password`, { newPassword });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function updateMyAccount(data) {
  try {
    const result = await api.put("/api/auth/me", data);
    setToken(result.token);
    if (result.user) {
      currentUser = result.user;
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export { fetchMe };
