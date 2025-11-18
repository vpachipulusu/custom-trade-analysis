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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import BookIcon from "@mui/icons-material/Book";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./Layout.module.scss";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openTradesCount, setOpenTradesCount] = useState(0);
  const { user, logout } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Fetch open trades count for badge
  useEffect(() => {
    if (user) {
      fetchOpenTradesCount();
    }
  }, [user]);

  const fetchOpenTradesCount = async () => {
    try {
      const response = await fetch(
        "/api/journal/trades?status=open&limit=1000"
      );
      if (response.ok) {
        const data = await response.json();
        setOpenTradesCount(data.trades?.length || 0);
      }
    } catch (error) {
      console.error("Failed to fetch open trades count:", error);
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
      </List>
    </Box>
  );

  return (
    <Box className={styles.root}>
      <AppBar position="static">
        <Toolbar>
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
          <Typography
            variant="h6"
            component="div"
            sx={{ cursor: "pointer" }}
            onClick={() => router.push("/dashboard")}
          >
            TradingView AI Evaluator
          </Typography>

          {!isMobile && (
            <Box sx={{ display: "flex", gap: 2, mx: 4, flexGrow: 1 }}>
              <Button color="inherit" onClick={() => router.push("/dashboard")}>
                Dashboard
              </Button>
              <Button
                color="inherit"
                onClick={() => router.push("/journal")}
                startIcon={<BookIcon />}
              >
                <Badge badgeContent={openTradesCount} color="secondary">
                  Journal
                </Badge>
              </Button>
              <Button
                color="inherit"
                onClick={() => router.push("/automation")}
              >
                Automation
              </Button>
              <Button
                color="inherit"
                onClick={() => router.push("/economic-calendar")}
              >
                Economic Calendar
              </Button>
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {user && (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Typography
                variant="body2"
                sx={{ mr: 2, display: { xs: "none", sm: "block" } }}
              >
                {user.email}
              </Typography>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <AccountCircle />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <MenuItem disabled>
                  <Typography variant="body2">{user.email}</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
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

      <Box component="main" className={styles.content}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {children}
        </Container>
      </Box>

      <Box component="footer" className={styles.footer}>
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
