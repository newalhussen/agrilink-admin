import * as React from "react";
import { ApiError, api, tokens } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

/**
 * Operators sign in with phone + password. Only ADMIN accounts may use this app; any other role that
 * authenticates successfully is signed straight back out.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [status, setStatus] = React.useState<AuthState["status"]>(tokens.access ? "loading" : "anonymous");

  const clear = React.useCallback(() => {
    tokens.clear();
    setUser(null);
    setStatus("anonymous");
  }, []);

  React.useEffect(() => {
    if (!tokens.access) return;
    api
      .get<User>("/users/me")
      .then((me) => {
        if (me.role !== "ADMIN") throw new Error("not an admin");
        setUser(me);
        setStatus("authenticated");
      })
      .catch(clear);
  }, [clear]);

  React.useEffect(() => {
    window.addEventListener("agrilink:logout", clear);
    return () => window.removeEventListener("agrilink:logout", clear);
  }, [clear]);

  const login = React.useCallback(async (phone: string, password: string) => {
    const auth = await api.post<AuthResponse>("/auth/login", { phone, password });
    if (auth.user.role !== "ADMIN") {
      await api.post("/auth/logout", { refreshToken: auth.refreshToken }).catch(() => undefined);
      throw new ApiError(403, "ACCESS_DENIED", "This console is for AgriLink operations staff only.");
    }
    tokens.set(auth);
    setUser(auth.user);
    setStatus("authenticated");
  }, []);

  const logout = React.useCallback(async () => {
    const refreshToken = tokens.refresh;
    if (refreshToken) await api.post("/auth/logout", { refreshToken }).catch(() => undefined);
    clear();
  }, [clear]);

  const value = React.useMemo(() => ({ user, status, login, logout }), [user, status, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
