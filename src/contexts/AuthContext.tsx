import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authService } from "@/lib/authService";
import type { User } from "@/lib/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    phoneNumber: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * ✅ FIXED: Initialize auth state on app mount
   * 
   * Flow:
   * 1. Check jika token ada di localStorage
   * 2. Jika tidak ada: setUser(null) immediately
   * 3. Jika ada: call authService.me() untuk validate token
   * 4. Success: setUser dengan data dari API
   * 5. Error/401: Clear token (done by api.ts interceptor)
   * 6. Always: setLoading(false) di akhir
   */
  useEffect(() => {
    const initAuth = async () => {
      const initStartTime = Date.now();
      
      try {
        const token = localStorage.getItem("auth_token");
        
        if (!token) {
          console.log("⚠️ [AuthContext] No token found - user not authenticated");
          setUser(null);
          setLoading(false);
          return;
        }

        console.log("🔍 [AuthContext] Token found - validating with /me endpoint...");
        
        // ✅ Call me() untuk validate token & get fresh user data
        const profile = await authService.me();
        
        if (profile) {
          console.log("✅ [AuthContext] Profile loaded:", profile.name);
          setUser(profile);
        } else {
          console.warn("⚠️ [AuthContext] me() returned null - clearing session");
          setUser(null);
          // Token will be cleared by api.ts interceptor if 401 occurred
        }
        
        setLoading(false);

      } catch (error) {
        console.error("❌ [AuthContext] Initialization error:", error);
        setUser(null);
        setLoading(false);
        // Note: If 401, api.ts interceptor will clear token & redirect
      } finally {
        // Safeguard: Ensure loading is false after 5 seconds max
        // to prevent infinite loading state
        const elapsed = Date.now() - initStartTime;
        if (elapsed > 5000) {
          console.warn("⚠️ [AuthContext] Initialization took too long, force complete");
          setLoading(false);
        }
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const { user } = await authService.login({ email, password });
    setUser(user);
    console.log("✅ [AuthContext] User logged in:", user?.name);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phoneNumber: string
  ) => {
    const { user } = await authService.register({
      name,
      email,
      password,
      phone_number: phoneNumber,
    });
    setUser(user);
    console.log("✅ [AuthContext] User registered:", user?.name);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    console.log("✅ [AuthContext] User logged out");
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};