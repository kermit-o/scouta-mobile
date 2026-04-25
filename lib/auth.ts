import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { User } from "./types";

const TOKEN_KEY = "scouta_auth_token";
const USER_KEY = "scouta_auth_user";

const isWeb = Platform.OS === "web";

// --- Low-level storage ---

async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // localStorage may be unavailable (private browsing, etc.)
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  } else {
    return SecureStore.getItemAsync(key);
  }
}

async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// --- Token ---

export async function saveToken(token: string): Promise<void> {
  await setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

// --- User ---

export async function saveUser(user: User): Promise<void> {
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<User | null> {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// --- Clear all ---

export async function clearAuth(): Promise<void> {
  await removeItem(TOKEN_KEY);
  await removeItem(USER_KEY);
}

// --- JWT helpers ---

/**
 * Decode the payload of a JWT without verifying the signature.
 * Returns null if the token is malformed.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64url -> Base64
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Pad if needed
    while (payload.length % 4 !== 0) {
      payload += "=";
    }
    const decoded = atob(payload);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check whether a JWT is expired.
 * Returns true if expired or unparseable, false if still valid.
 * Adds a 60-second buffer so we refresh slightly before real expiry.
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return true;
  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp - 60 < nowSeconds;
}
