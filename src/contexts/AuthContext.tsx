"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "@/lib/firebase/clientApp";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to login";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create account";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to login with Google";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to logout";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getAuthToken = async (): Promise<string> => {
    if (!user) {
      throw new Error("No user logged in");
    }
    const token = await user.getIdToken();
    return `Bearer ${token}`;
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    signup,
    loginWithGoogle,
    logout,
    getAuthToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
