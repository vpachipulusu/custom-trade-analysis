"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { ThemeProvider as MuiThemeProvider, createTheme, Theme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme-mode") as ThemeMode | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setMode(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setMode(prefersDark ? "dark" : "light");
    }
    setMounted(true);
  }, []);

  // Save theme preference to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("theme-mode", mode);
    }
  }, [mode, mounted]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const theme = useMemo<Theme>(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === "light" ? "#667eea" : "#6366f1",
            light: mode === "light" ? "#8b9ffc" : "#818cf8",
            dark: mode === "light" ? "#4c5fcd" : "#4f46e5",
          },
          secondary: {
            main: mode === "light" ? "#764ba2" : "#8b5cf6",
            light: mode === "light" ? "#9b6bd1" : "#a78bfa",
            dark: mode === "light" ? "#5a3880" : "#7c3aed",
          },
          background: {
            default: mode === "light" ? "#f8fafc" : "#0a0a0f",
            paper: mode === "light" ? "#ffffff" : "#18181b",
          },
          text: {
            primary: mode === "light" ? "rgba(15, 23, 42, 0.95)" : "rgba(250, 250, 250, 0.95)",
            secondary: mode === "light" ? "rgba(15, 23, 42, 0.65)" : "rgba(161, 161, 170, 0.9)",
          },
          divider: mode === "light" ? "rgba(15, 23, 42, 0.08)" : "rgba(250, 250, 250, 0.06)",
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
                borderRadius: 12,
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
                borderRadius: 12,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                textTransform: "none",
                fontWeight: 600,
              },
            },
          },
        },
        shape: {
          borderRadius: 12,
        },
      }),
    [mode]
  );

  const contextValue = useMemo(
    () => ({
      mode,
      toggleTheme,
      setTheme,
    }),
    [mode]
  );

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
