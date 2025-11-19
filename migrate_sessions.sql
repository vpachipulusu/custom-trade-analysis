-- Migrate session credentials from Layout to User
-- Take the first non-null session credentials from each user's layouts
UPDATE "User" u
SET 
  "tvSessionId" = l.sessionid,
  "tvSessionIdSign" = l."sessionidSign"
FROM (
  SELECT DISTINCT ON (l."userId") 
    l."userId",
    l.sessionid,
    l."sessionidSign"
  FROM "Layout" l
  WHERE l.sessionid IS NOT NULL
  ORDER BY l."userId", l."createdAt" DESC
) l
WHERE u.id = l."userId";
