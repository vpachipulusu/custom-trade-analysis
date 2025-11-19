import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  bio: string | null;
  phoneNumber: string | null;
  location: string | null;
  website: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
}

export interface UpdateProfileData {
  displayName?: string | null;
  bio?: string | null;
  phoneNumber?: string | null;
  location?: string | null;
  website?: string | null;
}

// Get user profile
export function useProfile() {
  const { getAuthToken } = useAuth();

  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const token = await getAuthToken();
      const response = await axios.get("/api/profile", {
        headers: { Authorization: token },
      });
      return response.data as UserProfile;
    },
  });
}

// Update profile
export function useUpdateProfile() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const token = await getAuthToken();
      const response = await axios.put("/api/profile", data, {
        headers: { Authorization: token },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// Upload avatar
export function useUploadAvatar() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await axios.post("/api/profile/avatar", formData, {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// Delete avatar
export function useDeleteAvatar() {
  const { getAuthToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      const response = await axios.delete("/api/profile/avatar", {
        headers: { Authorization: token },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
