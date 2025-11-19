"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import {
  Computer,
  Smartphone,
  Tablet,
  DeviceUnknown,
  LocationOn,
} from "@mui/icons-material";
import { useLoginHistory } from "@/hooks/useSecurity";

export default function LoginHistoryTable() {
  const { data: loginHistory, isLoading, error } = useLoginHistory(10);

  const getDeviceIcon = (device: string | null) => {
    if (!device) return <DeviceUnknown fontSize="small" />;
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes("mobile") || deviceLower.includes("phone")) {
      return <Smartphone fontSize="small" />;
    }
    if (deviceLower.includes("tablet")) {
      return <Tablet fontSize="small" />;
    }
    return <Computer fontSize="small" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  if (isLoading) {
    return (
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
        <CardContent>
          <Alert severity="error">Failed to load login history</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Recent Login Activity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Your recent login sessions (last 10 logins)
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {!loginHistory || loginHistory.length === 0 ? (
          <Alert severity="info">No login history available yet</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Device</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loginHistory.map((record, index) => (
                  <TableRow
                    key={record.id}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      bgcolor: index === 0 ? "action.hover" : "transparent",
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {formatDate(record.loginAt)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(record.loginAt).toLocaleString()}
                        </Typography>
                        {index === 0 && (
                          <Chip
                            label="Current"
                            size="small"
                            color="success"
                            sx={{ ml: 1, height: 20 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        {getDeviceIcon(record.device)}
                        <Box>
                          <Typography variant="body2">
                            {record.browser || "Unknown Browser"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {record.device || "Unknown Device"}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2">
                          {record.location || "Unknown"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {record.ipAddress || "N/A"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
