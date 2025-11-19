"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
  Divider,
  Breadcrumbs,
  Link,
  Button,
} from "@mui/material";
import {
  Person,
  Security,
  Notifications,
  Dashboard as DashboardIcon,
  Menu as MenuIcon,
  ArrowBack,
  Home,
} from "@mui/icons-material";

interface ProfileLayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 260;

const navigationItems = [
  {
    label: "Overview",
    path: "/profile",
    icon: <DashboardIcon />,
  },
  {
    label: "Profile Settings",
    path: "/profile/settings",
    icon: <Person />,
  },
  {
    label: "Security & Password",
    path: "/profile/security",
    icon: <Security />,
  },
  {
    label: "Notifications",
    path: "/profile/notifications",
    icon: <Notifications />,
  },
];

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Get current page title from pathname
  const getCurrentPageTitle = () => {
    const item = navigationItems.find((item) => item.path === pathname);
    return item?.label || "Profile";
  };

  const drawerContent = (
    <Box>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight="bold" color="primary.main">
          Profile Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your account
        </Typography>
      </Box>
      <Divider />
      <List sx={{ pt: 2 }}>
        {/* Back to Dashboard - Mobile Only */}
        {isMobile && (
          <ListItemButton
            onClick={() => {
              router.push("/dashboard");
              setMobileOpen(false);
            }}
            sx={{
              mx: 1,
              borderRadius: 2,
              mb: 1,
              bgcolor: "primary.main",
              color: "white",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: "white" }}>
              <Home />
            </ListItemIcon>
            <ListItemText
              primary="Back to Dashboard"
              primaryTypographyProps={{ fontWeight: "bold" }}
            />
          </ListItemButton>
        )}
        <Divider sx={{ mb: 1 }} />
        {navigationItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItemButton
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              selected={isActive}
              sx={{
                mx: 1,
                borderRadius: 2,
                mb: 0.5,
                "&.Mui-selected": {
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": {
                    bgcolor: "primary.dark",
                  },
                  "& .MuiListItemIcon-root": {
                    color: "white",
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActive ? "white" : "text.secondary",
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: isActive ? "bold" : "normal",
                }}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "calc(100vh - 64px)" }}>
      {/* Mobile Header */}
      {isMobile && (
        <Box
          sx={{
            position: "fixed",
            top: 64,
            left: 0,
            right: 0,
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider",
            zIndex: theme.zIndex.drawer - 1,
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <IconButton
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ color: "primary.main" }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight="bold">
            Profile Settings
          </Typography>
        </Box>
      )}

      {/* Sidebar Navigation - Desktop */}
      {!isMobile && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              position: "relative",
              height: "100%",
              borderRight: 1,
              borderColor: "divider",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Sidebar Navigation - Mobile */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance
          }}
          sx={{
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          mt: isMobile ? "64px" : 0,
          bgcolor: "background.default",
          minHeight: "100%",
        }}
      >
        {/* Breadcrumbs & Back Navigation - Desktop Only */}
        {!isMobile && (
          <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.push("/dashboard")}
              variant="outlined"
              size="small"
              sx={{ borderRadius: 2 }}
            >
              Back to Dashboard
            </Button>
            <Breadcrumbs aria-label="breadcrumb" sx={{ flexGrow: 1 }}>
              <Link
                underline="hover"
                sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                color="inherit"
                onClick={() => router.push("/dashboard")}
              >
                <Home sx={{ mr: 0.5 }} fontSize="small" />
                Dashboard
              </Link>
              <Link
                underline="hover"
                sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                color="inherit"
                onClick={() => router.push("/profile")}
              >
                <Person sx={{ mr: 0.5 }} fontSize="small" />
                Profile
              </Link>
              {pathname !== "/profile" && (
                <Typography
                  sx={{ display: "flex", alignItems: "center" }}
                  color="text.primary"
                >
                  {getCurrentPageTitle()}
                </Typography>
              )}
            </Breadcrumbs>
          </Box>
        )}

        {children}
      </Box>
    </Box>
  );
}
