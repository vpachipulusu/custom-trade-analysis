import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface AppConfig {
  maxLayoutsPerSymbol: number;
  maxSnapshotsPerLayout: number;
}

/**
 * Hook to fetch application configuration
 * This is cached and doesn't require authentication
 */
export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const response = await axios.get("/api/config");
      return response.data as AppConfig;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
