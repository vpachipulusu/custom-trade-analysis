import { useEffect, useState } from "react";
import axios from "axios";
import { getLogger } from "@/lib/logging";

export function useUserSettings() {
  const logger = getLogger();
  const [settings, setSettings] = useState<{
    defaultAiModel?: string;
    sessionid?: string;
    sessionidSign?: string;
  }>({});
  const [loading, setLoading] = useState(true);

  const fetchSettings = async (token: string) => {
    try {
      const response = await axios.get("/api/user/settings", {
        headers: { Authorization: token },
      });
      setSettings(response.data);
    } catch (error) {
      logger.error("Failed to fetch user settings", { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    fetchSettings,
    refetchSettings: fetchSettings,
  };
}
