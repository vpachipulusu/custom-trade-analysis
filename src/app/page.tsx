"use client";

import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { useRouter } from "next/navigation";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SpeedIcon from "@mui/icons-material/Speed";

export default function Home() {
  const router = useRouter();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        py: 8,
      }}
    >
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: "center", mb: 8, color: "white" }}>
          <Typography variant="h2" component="h1" fontWeight={700} gutterBottom>
            TradingView AI Evaluator
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            AI-Powered Technical Analysis for Your TradingView Charts
          </Typography>
          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => router.push("/login")}
              sx={{
                bgcolor: "white",
                color: "#667eea",
                "&:hover": { bgcolor: "#f5f5f5" },
                px: 4,
                py: 1.5,
                fontSize: "1.1rem",
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
                color: "white",
                "&:hover": {
                  borderColor: "#f5f5f5",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
                px: 4,
                py: 1.5,
                fontSize: "1.1rem",
              }}
            >
              Sign Up
            </Button>
          </Box>
        </Box>

        {/* Features */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", bgcolor: "rgba(255,255,255,0.95)" }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <ShowChartIcon sx={{ fontSize: 60, color: "#667eea", mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Chart Snapshots
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Generate high-quality snapshots of your TradingView charts
                  with custom layouts and time intervals
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", bgcolor: "rgba(255,255,255,0.95)" }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <AutoAwesomeIcon
                  sx={{ fontSize: 60, color: "#764ba2", mb: 2 }}
                />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  AI Analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get intelligent trading recommendations powered by GPT-4o
                  Vision with confidence scores and detailed reasoning
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", bgcolor: "rgba(255,255,255,0.95)" }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <SpeedIcon sx={{ fontSize: 60, color: "#667eea", mb: 2 }} />
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  Fast & Reliable
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Quick snapshot generation and analysis with secure cloud
                  storage and real-time updates
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* How It Works */}
        <Card sx={{ bgcolor: "rgba(255,255,255,0.95)", mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h5"
              fontWeight={600}
              gutterBottom
              textAlign="center"
              sx={{ mb: 3 }}
            >
              How It Works
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      bgcolor: "#667eea",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      margin: "0 auto 1rem",
                    }}
                  >
                    1
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Create Layout
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add your TradingView chart layout with symbol and interval
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      bgcolor: "#764ba2",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      margin: "0 auto 1rem",
                    }}
                  >
                    2
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Generate Snapshot
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create a snapshot of your chart using CHART-IMG API
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      bgcolor: "#667eea",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      margin: "0 auto 1rem",
                    }}
                  >
                    3
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    AI Analysis
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Get AI-powered analysis with BUY/SELL/HOLD recommendations
                  </Typography>
                </Box>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      bgcolor: "#764ba2",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "1.5rem",
                      margin: "0 auto 1rem",
                    }}
                  >
                    4
                  </Box>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    View Results
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Review detailed analysis with confidence scores and
                    reasoning
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* CTA */}
        <Box sx={{ textAlign: "center", color: "white" }}>
          <Typography variant="h5" gutterBottom>
            Ready to get started?
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
            Sign up now and start analyzing your charts with AI
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<PersonAddIcon />}
            onClick={() => router.push("/signup")}
            sx={{
              bgcolor: "white",
              color: "#667eea",
              "&:hover": { bgcolor: "#f5f5f5" },
              px: 5,
              py: 1.5,
              fontSize: "1.1rem",
            }}
          >
            Get Started Free
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
