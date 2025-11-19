"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Box,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Menu,
  MenuItem,
  Pagination,
  Snackbar,
} from "@mui/material";
import {
  Delete,
  MoreVert,
  CheckCircle,
  Info,
  Warning,
  Error as ErrorIcon,
  Security,
  DoneAll,
  FilterList,
} from "@mui/icons-material";
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  type Notification,
} from "@/hooks/useNotifications";

export default function NotificationsPanel() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data, isLoading, error } = useNotifications({
    page,
    limit: 10,
    unreadOnly,
    type: typeFilter,
  });

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, notificationId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedNotification(notificationId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedNotification(null);
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead.mutate(notificationId, {
      onSuccess: () => {
        setSuccess("Notification marked as read");
      },
    });
    handleMenuClose();
  };

  const handleDelete = (notificationId: string) => {
    deleteNotification.mutate(notificationId, {
      onSuccess: () => {
        setSuccess("Notification deleted");
      },
    });
    handleMenuClose();
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: () => {
        setSuccess("All notifications marked as read");
      },
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle sx={{ color: "success.main" }} />;
      case "warning":
        return <Warning sx={{ color: "warning.main" }} />;
      case "error":
        return <ErrorIcon sx={{ color: "error.main" }} />;
      case "security":
        return <Security sx={{ color: "primary.main" }} />;
      default:
        return <Info sx={{ color: "info.main" }} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "error":
        return "error";
      case "security":
        return "primary";
      default:
        return "info";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
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
          <Alert severity="error">Failed to load notifications</Alert>
        </CardContent>
      </Card>
    );
  }

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
      <CardContent sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              startIcon={<FilterList />}
              onClick={() => setUnreadOnly(!unreadOnly)}
              variant={unreadOnly ? "contained" : "outlined"}
            >
              Unread Only
            </Button>
            {unreadCount > 0 && (
              <Button
                size="small"
                startIcon={<DoneAll />}
                onClick={handleMarkAllAsRead}
                variant="outlined"
                disabled={markAllAsRead.isPending}
              >
                Mark All Read
              </Button>
            )}
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Info sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No notifications
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You're all caught up!
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ p: 0 }}>
              {notifications.map((notification: Notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    bgcolor: notification.read ? "transparent" : "action.hover",
                    borderRadius: 2,
                    mb: 1,
                    border: 1,
                    borderColor: notification.read ? "transparent" : "primary.main",
                  }}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={(e) => handleMenuOpen(e, notification.id)}
                    >
                      <MoreVert />
                    </IconButton>
                  }
                >
                  <Box sx={{ mr: 2 }}>{getNotificationIcon(notification.type)}</Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="body1" fontWeight="medium">
                          {notification.title}
                        </Typography>
                        <Chip
                          label={notification.type}
                          size="small"
                          color={getNotificationColor(notification.type) as any}
                          sx={{ height: 20 }}
                        />
                        {!notification.read && (
                          <Chip
                            label="New"
                            size="small"
                            color="primary"
                            sx={{ height: 20 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {notification.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(notification.createdAt)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {/* Pagination */}
            {data && data.pagination.pages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
                <Pagination
                  count={data.pagination.pages}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {selectedNotification && (
            <>
              <MenuItem onClick={() => handleMarkAsRead(selectedNotification)}>
                <CheckCircle sx={{ mr: 1 }} fontSize="small" />
                Mark as Read
              </MenuItem>
              <MenuItem
                onClick={() => handleDelete(selectedNotification)}
                sx={{ color: "error.main" }}
              >
                <Delete sx={{ mr: 1 }} fontSize="small" />
                Delete
              </MenuItem>
            </>
          )}
        </Menu>

        {/* Success Notification */}
        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
