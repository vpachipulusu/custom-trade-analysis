import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

export interface AnalysisResult {
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
}

export interface EconomicAnalysis {
  impactSummary: string;
  immediateRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  weeklyOutlook: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
  warnings: string[];
  opportunities: string[];
  recommendation: string;
}

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

  // AI Model tracking
  aiModel?: string | null;
  aiModelName?: string | null;

  // Dual AI analysis results (legacy - backward compatibility)
  openaiAnalysis?: AnalysisResult | null;
  deepseekAnalysis?: AnalysisResult | null;
  aiErrors?: {
    openai?: string;
    deepseek?: string;
  } | null;

  createdAt: string;
  snapshot: {
    id: string;
    layoutId: string;
    url: string;
    imageData?: string;
    layout: {
      symbol: string | null;
      interval: string | null;
    };
  };
  economicContext?: {
    symbol: string;
    upcomingEvents: any[];
    immediateRisk: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
    weeklyEvents: any[];
    weeklyOutlook: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
    impactSummary: string;
    warnings: string[];
    opportunities: string[];
    recommendation: string;
    // Dual AI economic analysis results
    openaiEconomic?: EconomicAnalysis | null;
    deepseekEconomic?: EconomicAnalysis | null;
  } | null;
  // Multi-layout analysis fields
  isMultiLayout?: boolean;
  multiLayoutData?: {
    layoutsAnalyzed: number;
    intervals: string[];
    multiLayoutSnapshots: Array<{
      interval: string;
      layoutId: string;
      snapshotId: string;
      imageUrl: string;
    }>;
  } | null;
  // Automation tracking
  isAutomated?: boolean;
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
    mutationFn: async (params: { snapshotId: string; aiModel?: string }) => {
      const token = await getAuthToken();
      const response = await axios.post(
        "/api/analyze",
        {
          snapshotId: params.snapshotId,
          aiModel: params.aiModel,
        },
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

// Create analysis from symbol (analyzes all layouts for that symbol)
export function useCreateSymbolAnalysis() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { symbol: string; aiModel?: string }) => {
      const token = await getAuthToken();
      const response = await axios.post(
        "/api/analyze",
        {
          symbol: params.symbol,
          aiModel: params.aiModel,
        },
        {
          headers: { Authorization: token },
        }
      );
      return response.data as Analysis & {
        layoutsAnalyzed: number;
        intervals: string[];
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
    },
  });
}
