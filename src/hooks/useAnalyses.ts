import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

export interface Analysis {
  id: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  timeframe: "intraday" | "swing" | "long";
  reasons: string[];
  tradeSetup?: {
    quality: "A" | "B" | "C";
    entryPrice: number | null;
    stopLoss: number | null;
    targetPrice: number | null;
    riskRewardRatio: number | null;
    setupDescription: string;
  } | null;
  createdAt: string;
  snapshot: {
    id: string;
    layoutId: string;
    url: string;
    layout: {
      symbol: string | null;
      interval: string | null;
    };
  };
  economicContext?: {
    symbol: string;
    upcomingEvents: any[];
    immediateRisk: string;
    weeklyEvents: any[];
    weeklyOutlook: string;
    impactSummary: string;
    warnings: string[];
    opportunities: string[];
    recommendation: string;
  } | null;
}

export interface AnalysesResponse {
  analyses: Analysis[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Get paginated analyses
export function useAnalyses(page: number = 1, limit: number = 10) {
  const { getAuthToken } = useAuth();

  return useQuery({
    queryKey: ["analyses", page, limit],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await axios.get(
        `/api/analyses?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: token },
        }
      );
      return response.data as AnalysesResponse;
    },
  });
}

// Get single analysis
export function useAnalysis(id: string | null) {
  const { getAuthToken } = useAuth();

  return useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      if (!id) return null;
      const token = await getAuthToken();
      const response = await axios.get(`/api/analyses/${id}`, {
        headers: { Authorization: token },
      });
      return response.data as Analysis;
    },
    enabled: !!id,
  });
}

// Create analysis
export function useCreateAnalysis() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (snapshotId: string) => {
      const token = await getAuthToken();
      const response = await axios.post(
        "/api/analyze",
        { snapshotId },
        {
          headers: { Authorization: token },
        }
      );
      return response.data as Analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}
