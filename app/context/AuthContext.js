"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { getAuthInstance } from "../utils/barikoiAuth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const auth = getAuthInstance();
    const currentAuthState = auth.getAuthState();

    setAuthState({
      isAuthenticated: currentAuthState.isAuthenticated || false,
      user: currentAuthState.user || null,
      isLoading: false,
    });

    const handleAuthChange = (state) => {
      setAuthState({
        isAuthenticated: state.isAuthenticated || false,
        user: state.user || null,
        isLoading: false,
      });
    };

    auth.on("authStateChange", handleAuthChange);
    auth.on("login", handleAuthChange);
    auth.on("logout", () => {
      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
      });
    });

    return () => {
      auth.off("authStateChange", handleAuthChange);
      auth.off("login", handleAuthChange);
      auth.off("logout", handleAuthChange);
    };
  }, []);

  const login = async (email, password) => {
    const auth = getAuthInstance();
    return await auth.login(email, password);
  };

  const logout = () => {
    const auth = getAuthInstance();
    auth.logout();
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
