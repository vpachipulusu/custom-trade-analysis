"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getLogger } from "@/lib/logging";

interface JournalSettings {
  currency: string;
  startingBalance: string;
  currentBalance: string;
  timezone: string;
  defaultPositionSize?: string;
  defaultRiskPercent?: string;
}

interface JournalContextType {
  currency: string;
  settings: JournalSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const logger = getLogger();
  const { user } = useAuth();
  const [currency, setCurrency] = useState<string>("GBP");
  const [settings, setSettings] = useState<JournalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/journal/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setCurrency(data.settings.currency || "GBP");
      }
    } catch (error) {
      logger.error("Error fetching journal settings", { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, [user]);

  return (
    <JournalContext.Provider
      value={{ currency, settings, loading, refreshSettings }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error("useJournal must be used within a JournalProvider");
  }
  return context;
}
