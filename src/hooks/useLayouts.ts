import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

export interface Layout {
  id: string;
  layoutId: string | null;
  symbol: string | null;
  interval: string | null;
  createdAt: string;
  snapshotCount: number;
}

export interface CreateLayoutData {
  layoutId?: string;
  symbol?: string;
  interval?: string;
  sessionid?: string;
  sessionidSign?: string;
}

export interface UpdateLayoutData extends CreateLayoutData {}

// Get all layouts
export function useLayouts() {
  const { getAuthToken } = useAuth();

  return useQuery({
    queryKey: ["layouts"],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await axios.get("/api/layouts", {
        headers: { Authorization: token },
      });
      return response.data as Layout[];
    },
  });
}

// Create layout
export function useCreateLayout() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLayoutData) => {
      const token = await getAuthToken();
      const response = await axios.post("/api/layouts", data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts"] });
    },
  });
}

// Update layout
export function useUpdateLayout() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateLayoutData;
    }) => {
      const token = await getAuthToken();
      const response = await axios.patch(`/api/layouts/${id}`, data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts"] });
    },
  });
}

// Delete layout
export function useDeleteLayout() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const token = await getAuthToken();
      await axios.delete(`/api/layouts/${id}`, {
        headers: { Authorization: token },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["layouts"] });
    },
  });
}
