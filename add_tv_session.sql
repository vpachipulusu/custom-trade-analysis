-- Add TradingView session columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tvSessionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tvSessionIdSign" TEXT;
