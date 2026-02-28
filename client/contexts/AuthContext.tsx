import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { saveToken, getToken, deleteToken } from "../lib/storage";
import { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, restore session from storage
  useEffect(() => {
    (async () => {
      const stored = await getToken();
      if (stored) {
        try {
          // Verify token is still valid
          const res = await api.get("/users/me", {
            headers: { Authorization: `Bearer ${stored}` },
          });
          setToken(stored);
          setUser(res.data);
        } catch {
          await deleteToken();
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post("/auth/login", { username, password });
    const { token: newToken, user: newUser } = res.data;
    await saveToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await deleteToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
