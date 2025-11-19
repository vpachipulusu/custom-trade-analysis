import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

export interface NotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: string;
}

// Get notifications
export function useNotifications(params: NotificationsParams = {}) {
  const { getAuthToken } = useAuth();
  const { page = 1, limit = 20, unreadOnly = false, type } = params;

  return useQuery({
    queryKey: ["notifications", page, limit, unreadOnly, type],
    queryFn: async () => {
      const token = await getAuthToken();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(unreadOnly && { unreadOnly: "true" }),
        ...(type && { type }),
      });

      const response = await axios.get(`/api/notifications?${queryParams}`, {
        headers: { Authorization: token },
      });
      return response.data as NotificationsResponse;
    },
  });
}

// Mark notification as read
export function useMarkAsRead() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const token = await getAuthToken();
      const response = await axios.patch(
        `/api/notifications/${notificationId}`,
        {},
        {
          headers: { Authorization: token },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Mark all as read
export function useMarkAllAsRead() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      const response = await axios.post(
        "/api/notifications/mark-all-read",
        {},
        {
          headers: { Authorization: token },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const token = await getAuthToken();
      const response = await axios.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Get unread count only (for badge)
export function useUnreadCount() {
  const { getAuthToken } = useAuth();

  return useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await axios.get("/api/notifications?limit=1", {
        headers: { Authorization: token },
      });
      return (response.data as NotificationsResponse).unreadCount;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
