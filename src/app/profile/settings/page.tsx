"use client";

import React from "react";
import { ProtectedRoute } from '@/components/layout';
import ProfileLayout from "@/components/profile/ProfileLayout";
import ProfileSettings from "@/components/profile/ProfileSettings";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <ProfileLayout>
        <ProfileSettings />
      </ProfileLayout>
    </ProtectedRoute>
  );
}
