import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

export interface Snapshot {
  id: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  analysis?: {
    id: string;
  } | null;
}

// Get snapshots for a layout
export function useSnapshots(layoutId: string | null) {
  const { getAuthToken } = useAuth();

  return useQuery({
    queryKey: ["snapshots", layoutId],
    queryFn: async () => {
      if (!layoutId) return [];
      const token = await getAuthToken();
      const response = await axios.get(`/api/snapshots?layoutId=${layoutId}`, {
        headers: { Authorization: token },
      });
      return response.data as Snapshot[];
    },
    enabled: !!layoutId,
  });
}

// Create snapshot
export function useCreateSnapshot() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layoutId: string) => {
      const token = await getAuthToken();
      const response = await axios.post(
        "/api/snapshot",
        { layoutId },
        {
          headers: { Authorization: token },
        }
      );
      return response.data as Snapshot;
    },
    onSuccess: (_, layoutId) => {
      queryClient.invalidateQueries({ queryKey: ["snapshots", layoutId] });
      queryClient.invalidateQueries({ queryKey: ["layouts"] });
    },
  });
}
