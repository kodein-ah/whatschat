import { api } from "./api";
import type { AuthResponse, User } from "./types";

const USE_MOCK =
  (import.meta.env.VITE_USE_MOCK as string | undefined) !== "false";

const USERS_KEY = "mock_users";
const SESSION_KEY = "mock_session_user";

interface MockUserRecord extends User {
  password: string;
}

const loadUsers = (): MockUserRecord[] => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveUsers = (u: MockUserRecord[]) =>
  localStorage.setItem(USERS_KEY, JSON.stringify(u));

const generateUserId = () =>
  `u_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

const stripPassword = (u: MockUserRecord): User => {
  const { password, ...rest } = u;
  return rest;
};

export const authService = {
  async register(input: {
    name: string;
    email: string;
    password: string;
    phone_number: string;
  }): Promise<AuthResponse> {
    if (USE_MOCK) {
      const users = loadUsers();

      if (
        users.some(
          (u) => u.email?.toLowerCase() === input.email.toLowerCase()
        )
      ) {
        throw new Error("Email sudah terdaftar");
      }

      if (users.some((u) => u.phone_number === input.phone_number)) {
        throw new Error("Nomor HP sudah terdaftar");
      }

      const newUser: MockUserRecord = {
        id: generateUserId(),
        name: input.name,
        email: input.email,
        password: input.password,
        phone_number: input.phone_number,
        status: "Halo, saya pakai WhatChat!",
        online: true,
      };

      users.push(newUser);
      saveUsers(users);

      const token = `mock-${newUser.id}`;
      localStorage.setItem("auth_token", token);
      localStorage.setItem(SESSION_KEY, newUser.id);

      return { token, user: stripPassword(newUser) };
    }

    const { data } = await api.post<AuthResponse>("/register", input);
    localStorage.setItem("auth_token", data.token);
    return data;
  },

  async login(input: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    if (USE_MOCK) {
      const users = loadUsers();
      const found = users.find(
        (u) =>
          u.email?.toLowerCase() === input.email.toLowerCase() &&
          u.password === input.password
      );
      if (!found) throw new Error("Email atau password salah");

      const token = `mock-${found.id}`;
      localStorage.setItem("auth_token", token);
      localStorage.setItem(SESSION_KEY, found.id);

      return { token, user: stripPassword(found) };
    }

    const { data } = await api.post<AuthResponse>("/login", input);
    localStorage.setItem("auth_token", data.token);
    return data;
  },

  async logout(): Promise<void> {
    if (!USE_MOCK) {
      try {
        await api.post("/logout");
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem(SESSION_KEY);
  },

  /**
   * ✅ FIXED: Method untuk get current user
   * Digunakan saat refresh/mount untuk check apakah user masih login
   * 
   * Logic:
   * 1. Check token ada di localStorage
   * 2. Jika mock mode: cek dari SESSION_KEY
   * 3. Jika production: call /me endpoint
   * 4. Return user atau null jika tidak valid
   */
  async me(): Promise<User | null> {
    const token = localStorage.getItem("auth_token");
    
    // Jika tidak ada token, user belum login
    if (!token) {
      console.log("⚠️ [authService.me] No token in localStorage");
      return null;
    }

    // MOCK MODE: Get from localStorage SESSION
    if (USE_MOCK) {
      const id = localStorage.getItem(SESSION_KEY);
      if (!id) {
        console.log("⚠️ [authService.me] No session ID in mock mode");
        return null;
      }

      const users = loadUsers();
      const user = users.find((x) => x.id === id);

      if (user) {
        console.log("✅ [authService.me] User loaded from mock:", user.name);
        return stripPassword(user);
      } else {
        console.log("⚠️ [authService.me] User not found in mock database");
        return null;
      }
    }

    // PRODUCTION MODE: Call API /me endpoint
    try {
      console.log("📥 [authService.me] Calling /me endpoint with token...");
      const { data } = await api.get<User>("/me");
      console.log("✅ [authService.me] User loaded from API:", data?.name);
      return data;
    } catch (error) {
      console.error("❌ [authService.me] Failed to load user:", error);
      // Note: 401 error sudah di-handle oleh api.ts interceptor
      // Interceptor akan clear token & redirect to /auth
      return null;
    }
  },

  /**
   * ⚠️ DEPRECATED: Gunakan me() instead
   * Kept untuk backward compatibility
   */
  async currentUser(): Promise<User | null> {
    return this.me();
  },
};