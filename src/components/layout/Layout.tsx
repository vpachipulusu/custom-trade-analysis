"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
  Container,
  Button,
  Badge,
  alpha,
  Avatar,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import BookIcon from "@mui/icons-material/Book";
import NotificationsIcon from "@mui/icons-material/Notifications";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useAuth } from "@/contexts/AuthContext";
import { getLogger } from "@/lib/logging";
import { useUnreadCount } from "@/hooks/useNotifications";
import ThemeToggle from "@/components/ThemeToggle";
import styles from "./Layout.module.scss";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const logger = getLogger();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openTradesCount, setOpenTradesCount] = useState(0);
  const { user, logout } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isDark = theme.palette.mode === "dark";

  // Fetch open trades count for badge
  useEffect(() => {
    if (user) {
      fetchOpenTradesCount();
    }
  }, [user]);

  const fetchOpenTradesCount = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const response = await fetch(
        "/api/journal/trades?status=open&limit=1000",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setOpenTradesCount(data.trades?.length || 0);
      }
    } catch (error) {
      logger.error("Failed to fetch open trades count", { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    router.push("/login");
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center" }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        TradingView AI
      </Typography>
      <List>
        <ListItem button onClick={() => router.push("/dashboard")}>
          <ListItemText primary="Dashboard" />
        </ListItem>
        <ListItem button onClick={() => router.push("/journal")}>
          <ListItemText
            primary={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Trading Journal
                {openTradesCount > 0 && (
                  <Badge badgeContent={openTradesCount} color="primary" />
                )}
              </Box>
            }
          />
        </ListItem>
        <ListItem button onClick={() => router.push("/automation")}>
          <ListItemText primary="Automation" />
        </ListItem>
        <ListItem button onClick={() => router.push("/economic-calendar")}>
          <ListItemText primary="Economic Calendar" />
        </ListItem>
        <ListItem button onClick={() => router.push("/profile")}>
          <ListItemText primary="Profile Settings" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: isDark ? alpha("#18181b", 0.95) : alpha(theme.palette.primary.main, 0.98),
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${alpha(theme.palette.common.white, isDark ? 0.1 : 0.2)}`,
        }}
      >
        <Container maxWidth="xl">
          <Toolbar sx={{ px: { xs: 0, sm: 2 }, minHeight: { xs: 64, sm: 70 } }}>
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo/Brand Section with Icon */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                cursor: "pointer",
                transition: "transform 0.2s ease-in-out",
                "&:hover": {
                  transform: "scale(1.02)",
                }
              }}
              onClick={() => router.push("/dashboard")}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.2)} 0%, ${alpha(theme.palette.common.white, 0.1)} 100%)`,
                  backdropFilter: "blur(10px)",
                }}
              >
                <TrendingUpIcon sx={{ fontSize: 24, color: "white" }} />
              </Box>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  display: { xs: "none", sm: "block" },
                  fontSize: { sm: "1.1rem", md: "1.25rem" }
                }}
              >
                TradingView AI Evaluator
              </Typography>
            </Box>

            {/* Navigation Links - Desktop */}
            {!isMobile && (
              <Box sx={{ display: "flex", gap: 1, mx: 4, flexGrow: 1 }}>
                <Button
                  color="inherit"
                  onClick={() => router.push("/dashboard")}
                  startIcon={<DashboardIcon />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      transform: "translateY(-1px)",
                    }
                  }}
                >
                  Dashboard
                </Button>
                <Button
                  color="inherit"
                  onClick={() => router.push("/journal")}
                  startIcon={<BookIcon />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      transform: "translateY(-1px)",
                    }
                  }}
                >
                  <Badge
                    badgeContent={openTradesCount}
                    color="secondary"
                    sx={{
                      "& .MuiBadge-badge": {
                        boxShadow: `0 2px 8px ${alpha(theme.palette.secondary.main, 0.4)}`
                      }
                    }}
                  >
                    Journal
                  </Badge>
                </Button>
                <Button
                  color="inherit"
                  onClick={() => router.push("/automation")}
                  startIcon={<AutoAwesomeIcon />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      transform: "translateY(-1px)",
                    }
                  }}
                >
                  Automation
                </Button>
                <Button
                  color="inherit"
                  onClick={() => router.push("/economic-calendar")}
                  startIcon={<CalendarMonthIcon />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      transform: "translateY(-1px)",
                    }
                  }}
                >
                  Economic Calendar
                </Button>
              </Box>
            )}

            <Box sx={{ flexGrow: 1 }} />

            {/* Right Side Icons & User Menu */}
            {user && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    mr: 1,
                    display: { xs: "none", md: "block" },
                    fontWeight: 500,
                    opacity: 0.9
                  }}
                >
                  {user.email}
                </Typography>

                <ThemeToggle />

                <IconButton
                  size="large"
                  aria-label="notifications"
                  onClick={() => router.push("/profile/notifications")}
                  color="inherit"
                  sx={{
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      transform: "scale(1.05)",
                    }
                  }}
                >
                  <Badge
                    badgeContent={unreadCount}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        boxShadow: `0 2px 8px ${alpha(theme.palette.error.main, 0.5)}`
                      }
                    }}
                  >
                    <NotificationsIcon />
                  </Badge>
                </IconButton>

                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  sx={{
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.15),
                      transform: "scale(1.05)",
                    }
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: alpha(theme.palette.common.white, 0.2),
                      fontSize: "0.95rem",
                      fontWeight: 600
                    }}
                  >
                    {user.email?.charAt(0).toUpperCase()}
                  </Avatar>
                </IconButton>

                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  sx={{
                    mt: 1.5,
                    "& .MuiPaper-root": {
                      borderRadius: 2,
                      minWidth: 200,
                      boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.15)}`,
                    }
                  }}
                >
                  <MenuItem disabled sx={{ opacity: 0.7 }}>
                    <Typography variant="body2" fontWeight={600}>{user.email}</Typography>
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      handleClose();
                      router.push("/profile");
                    }}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      }
                    }}
                  >
                    Profile Settings
                  </MenuItem>
                  <MenuItem
                    onClick={handleLogout}
                    sx={{
                      borderRadius: 1,
                      mx: 1,
                      color: theme.palette.error.main,
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                      }
                    }}
                  >
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          bgcolor: "background.default",
        }}
      >
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 3,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="xl">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} TradingView AI Evaluator. All rights
            reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
