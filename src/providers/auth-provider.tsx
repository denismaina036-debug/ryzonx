"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { UserProfile } from "@/types";

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isInvestor: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  user: UserProfile | null;
}

export function AuthProvider({ children, user }: AuthProviderProps) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isInvestor: user?.role === "investor" || user?.role === "administrator",
      isAdmin: user?.role === "administrator",
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
