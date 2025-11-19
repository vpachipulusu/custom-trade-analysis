import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/clientApp";

export interface UserSettings {
  id: string;
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
  notificationFrequency: string;
  twoFactorEnabled: boolean;
  lastPasswordChange: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginHistoryRecord {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  device: string | null;
  browser: string | null;
  loginAt: string;
}

export interface UpdateSettingsData {
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  marketingEmails?: boolean;
  securityAlerts?: boolean;
  notificationFrequency?: string;
  twoFactorEnabled?: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Get user settings
export function useSettings() {
  const { getAuthToken } = useAuth();

  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await axios.get("/api/settings", {
        headers: { Authorization: token },
      });
      return response.data as UserSettings;
    },
  });
}

// Update settings
export function useUpdateSettings() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSettingsData) => {
      const token = await getAuthToken();
      const response = await axios.put("/api/settings", data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

// Get login history
export function useLoginHistory(limit: number = 20) {
  const { getAuthToken } = useAuth();

  return useQuery({
    queryKey: ["loginHistory", limit],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await axios.get(`/api/security/login-history?limit=${limit}`, {
        headers: { Authorization: token },
      });
      return response.data as LoginHistoryRecord[];
    },
  });
}

// Change password
export function useChangePassword() {
  const { getAuthToken, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      if (!user || !auth.currentUser) {
        throw new Error("User not authenticated");
      }

      // Step 1: Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email!,
        data.currentPassword
      );

      try {
        await reauthenticateWithCredential(auth.currentUser, credential);
      } catch (error: any) {
        if (error.code === "auth/wrong-password") {
          throw new Error("Current password is incorrect");
        }
        throw new Error("Re-authentication failed. Please try again.");
      }

      // Step 2: Update password on client (Firebase)
      try {
        await updatePassword(auth.currentUser, data.newPassword);
      } catch (error: any) {
        throw new Error("Failed to update password. Please try again.");
      }

      // Step 3: Notify server to update lastPasswordChange
      const token = await getAuthToken();
      const response = await axios.post(
        "/api/profile/password",
        data,
        {
          headers: { Authorization: token },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
