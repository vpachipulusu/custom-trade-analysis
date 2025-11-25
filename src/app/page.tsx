"use client";

import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  IconButton,
} from "@mui/material";
import { useRouter } from "next/navigation";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TimelineIcon from "@mui/icons-material/Timeline";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AnalyticsIcon from "@mui/icons-material/Analytics";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const isDark = theme.palette.mode === "dark";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: isDark
          ? "linear-gradient(to bottom, #0a0a0f 0%, #1a1625 50%, #0a0a0f 100%)"
          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Theme Toggle - Floating Top Right */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 10,
        }}
      >
        <ThemeToggle />
      </Box>

      {/* Animated background elements */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: isDark ? 0.05 : 0.1,
          backgroundImage: isDark
            ? `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.5) 1px, transparent 1px),
               radial-gradient(circle at 80% 80%, rgba(255,255,255,0.5) 1px, transparent 1px)`
            : `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
               radial-gradient(circle at 80% 80%, white 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", py: { xs: 4, md: 8 } }}>
        {/* Hero Section */}
        <Box sx={{ textAlign: "center", mb: { xs: 6, md: 10 }, color: "white" }}>
          <Typography
            variant={isMobile ? "h3" : "h2"}
            component="h1"
            fontWeight={700}
            gutterBottom
            sx={{
              textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
              mb: 2,
            }}
          >
            TradingView AI Evaluator
          </Typography>
          <Typography
            variant={isMobile ? "h6" : "h5"}
            sx={{
              mb: 4,
              opacity: 0.95,
              maxWidth: "800px",
              mx: "auto",
              px: 2,
              lineHeight: 1.6,
            }}
          >
            Professional AI-Powered Technical Analysis for Your TradingView Charts
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            sx={{ px: 2 }}
          >
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => router.push("/login")}
              sx={{
                bgcolor: "white",
                color: isDark ? "#667eea" : "#667eea",
                "&:hover": {
                  bgcolor: isDark ? "#f0f0f0" : "#f5f5f5",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                },
                px: { xs: 3, sm: 5 },
                py: 1.5,
                fontSize: { xs: "1rem", sm: "1.1rem" },
                fontWeight: 600,
                transition: "all 0.3s ease",
                borderRadius: 2,
              }}
            >
              Sign In
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<PersonAddIcon />}
              onClick={() => router.push("/signup")}
              sx={{
                borderColor: "white",
                borderWidth: 2,
                color: "white",
                "&:hover": {
                  borderColor: "white",
                  borderWidth: 2,
                  bgcolor: isDark ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.15)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                },
                px: { xs: 3, sm: 5 },
                py: 1.5,
                fontSize: { xs: "1rem", sm: "1.1rem" },
                fontWeight: 600,
                transition: "all 0.3s ease",
                borderRadius: 2,
              }}
            >
              Get Started Free
            </Button>
          </Stack>
        </Box>

        {/* Key Features */}
        <Grid container spacing={3} sx={{ mb: { xs: 6, md: 8 } }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: "100%",
                bgcolor: isDark ? "rgba(24, 24, 27, 0.7)" : "rgba(255,255,255,0.98)",
                backdropFilter: isDark ? "blur(10px)" : "none",
                border: isDark ? "1px solid rgba(99, 102, 241, 0.2)" : "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: isDark
                    ? "0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99, 102, 241, 0.4)"
                    : "0 12px 24px rgba(0,0,0,0.15)",
                  border: isDark ? "1px solid rgba(99, 102, 241, 0.6)" : "none",
                  bgcolor: isDark ? "rgba(24, 24, 27, 0.9)" : "rgba(255,255,255,0.98)",
                },
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ textAlign: "center", p: { xs: 3, md: 4 } }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "rgba(102, 126, 234, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <ShowChartIcon sx={{ fontSize: 40, color: "#667eea" }} />
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Smart Chart Capture
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Automatically capture high-quality snapshots of your TradingView charts across multiple timeframes
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: "100%",
                bgcolor: isDark ? "rgba(24, 24, 27, 0.7)" : "rgba(255,255,255,0.98)",
                backdropFilter: isDark ? "blur(10px)" : "none",
                border: isDark ? "1px solid rgba(99, 102, 241, 0.2)" : "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: isDark
                    ? "0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99, 102, 241, 0.4)"
                    : "0 12px 24px rgba(0,0,0,0.15)",
                  border: isDark ? "1px solid rgba(99, 102, 241, 0.6)" : "none",
                  bgcolor: isDark ? "rgba(24, 24, 27, 0.9)" : "rgba(255,255,255,0.98)",
                },
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ textAlign: "center", p: { xs: 3, md: 4 } }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "rgba(118, 75, 162, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 40, color: "#764ba2" }} />
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  AI-Powered Insights
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Get intelligent trading signals with confidence scores and detailed technical analysis
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: "100%",
                bgcolor: isDark ? "rgba(24, 24, 27, 0.7)" : "rgba(255,255,255,0.98)",
                backdropFilter: isDark ? "blur(10px)" : "none",
                border: isDark ? "1px solid rgba(99, 102, 241, 0.2)" : "none",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: isDark
                    ? "0 20px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99, 102, 241, 0.4)"
                    : "0 12px 24px rgba(0,0,0,0.15)",
                  border: isDark ? "1px solid rgba(99, 102, 241, 0.6)" : "none",
                  bgcolor: isDark ? "rgba(24, 24, 27, 0.9)" : "rgba(255,255,255,0.98)",
                },
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ textAlign: "center", p: { xs: 3, md: 4 } }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    bgcolor: "rgba(102, 126, 234, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem",
                  }}
                >
                  <ScheduleIcon sx={{ fontSize: 40, color: "#667eea" }} />
                </Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Automated Alerts
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                  Schedule automatic analysis and receive instant Telegram notifications for trading signals
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Additional Features */}
        <Grid container spacing={3} sx={{ mb: { xs: 6, md: 8 } }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center" }}>
              <TimelineIcon sx={{ fontSize: 50, mb: 2, opacity: 0.9, color: "white" }} />
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: "white" }}>
                Multi-Timeframe Analysis
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                Analyze multiple timeframes simultaneously for comprehensive market insights
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center" }}>
              <NotificationsActiveIcon sx={{ fontSize: 50, mb: 2, opacity: 0.9, color: "white" }} />
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: "white" }}>
                Real-Time Alerts
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                Get notified instantly when trading signals change or meet your criteria
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center" }}>
              <AnalyticsIcon sx={{ fontSize: 50, mb: 2, opacity: 0.9, color: "white" }} />
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: "white" }}>
                Trading Journal
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                Track your trades and link them to AI analysis for performance insights
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: "center" }}>
              <TrendingUpIcon sx={{ fontSize: 50, mb: 2, opacity: 0.9, color: "white" }} />
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: "white" }}>
                Economic Calendar
              </Typography>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>
                Stay informed with integrated economic events and their market impact
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* How It Works */}
        <Card
          sx={{
            bgcolor: isDark ? "rgba(24, 24, 27, 0.7)" : "rgba(255,255,255,0.98)",
            backdropFilter: isDark ? "blur(10px)" : "none",
            border: isDark ? "1px solid rgba(99, 102, 241, 0.2)" : "none",
            mb: { xs: 6, md: 8 },
            borderRadius: 3,
            boxShadow: isDark
              ? "0 20px 60px rgba(0,0,0,0.6)"
              : "0 8px 32px rgba(0,0,0,0.1)",
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 5 } }}>
            <Typography
              variant={isMobile ? "h5" : "h4"}
              fontWeight={700}
              gutterBottom
              textAlign="center"
              sx={{ mb: { xs: 4, md: 6 }, color: isDark ? "#818cf8" : "#667eea" }}
            >
              How It Works
            </Typography>
            <Grid container spacing={{ xs: 3, md: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: { xs: 60, md: 70 },
                      height: { xs: 60, md: 70 },
                      borderRadius: "50%",
                      bgcolor: "#667eea",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: { xs: "1.5rem", md: "2rem" },
                      margin: "0 auto 1.5rem",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    1
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Connect Your Charts
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Add your TradingView layouts with symbols and intervals
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: { xs: 60, md: 70 },
                      height: { xs: 60, md: 70 },
                      borderRadius: "50%",
                      bgcolor: "#764ba2",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: { xs: "1.5rem", md: "2rem" },
                      margin: "0 auto 1.5rem",
                      boxShadow: "0 4px 12px rgba(118, 75, 162, 0.3)",
                    }}
                  >
                    2
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Capture & Analyze
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Generate snapshots and get instant AI-powered technical analysis
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: { xs: 60, md: 70 },
                      height: { xs: 60, md: 70 },
                      borderRadius: "50%",
                      bgcolor: "#667eea",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: { xs: "1.5rem", md: "2rem" },
                      margin: "0 auto 1.5rem",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    }}
                  >
                    3
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Automate & Alert
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Set up automated analysis and receive Telegram notifications
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: { xs: 60, md: 70 },
                      height: { xs: 60, md: 70 },
                      borderRadius: "50%",
                      bgcolor: "#764ba2",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: { xs: "1.5rem", md: "2rem" },
                      margin: "0 auto 1.5rem",
                      boxShadow: "0 4px 12px rgba(118, 75, 162, 0.3)",
                    }}
                  >
                    4
                  </Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    Track & Improve
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    Journal your trades and improve with performance insights
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Box
          sx={{
            textAlign: "center",
            color: "white",
            bgcolor: "rgba(255,255,255,0.1)",
            borderRadius: 3,
            p: { xs: 4, md: 6 },
            backdropFilter: "blur(10px)",
          }}
        >
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight={700} gutterBottom>
            Ready to Elevate Your Trading?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 4,
              opacity: 0.95,
              maxWidth: "600px",
              mx: "auto",
              lineHeight: 1.7,
              px: 2,
            }}
          >
            Join traders who are making smarter decisions with AI-powered technical analysis
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<PersonAddIcon />}
            onClick={() => router.push("/signup")}
            sx={{
              bgcolor: "white",
              color: "#667eea",
              "&:hover": {
                bgcolor: "#f5f5f5",
                transform: "translateY(-2px)",
                boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
              },
              px: { xs: 4, sm: 6 },
              py: 2,
              fontSize: { xs: "1rem", sm: "1.2rem" },
              fontWeight: 700,
              transition: "all 0.3s ease",
              borderRadius: 2,
            }}
          >
            Start Free Today
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
