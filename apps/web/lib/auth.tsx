"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  teamId: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser, teamId?: string | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount.
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("forge_token");
      const storedUser = localStorage.getItem("forge_user");
      const storedTeamId = localStorage.getItem("forge_team_id");
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as AuthUser);
      }
      if (storedTeamId) setTeamId(storedTeamId);
    } catch {
      // Ignore malformed storage.
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: AuthUser, newTeamId?: string | null) => {
    localStorage.setItem("forge_token", newToken);
    localStorage.setItem("forge_user", JSON.stringify(newUser));
    if (newTeamId) localStorage.setItem("forge_team_id", newTeamId);
    setToken(newToken);
    setUser(newUser);
    if (newTeamId !== undefined) setTeamId(newTeamId ?? null);
  };

  const logout = () => {
    localStorage.removeItem("forge_token");
    localStorage.removeItem("forge_user");
    localStorage.removeItem("forge_team_id");
    setToken(null);
    setUser(null);
    setTeamId(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, teamId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access the current auth state.
 * Must be used within AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { API_BASE };
