"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.scss";
import { useState, StrictMode } from "react";

const theme = createTheme({
  palette: {
    primary: {
      main: "#667eea",
    },
    secondary: {
      main: "#764ba2",
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <html lang="en">
      <body>
        <StrictMode>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <AuthProvider>{children}</AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </StrictMode>
      </body>
    </html>
  );
}
