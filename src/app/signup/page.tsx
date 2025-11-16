"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./signup.module.scss";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup, loginWithGoogle } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      await signup(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to signup with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className={styles.container}>
      <Card className={styles.card}>
        <CardContent className={styles.cardContent}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Sign Up
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ mb: 3 }}
          >
            Create your TradingView AI Evaluator account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              helperText="Minimum 6 characters"
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              margin="normal"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : "Create Account"}
            </Button>
          </form>

          <Divider sx={{ my: 2 }}>OR</Divider>

          <Button
            variant="outlined"
            fullWidth
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            Continue with Google
          </Button>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            Already have an account?{" "}
            <Button
              variant="text"
              onClick={() => router.push("/login")}
              disabled={loading}
            >
              Login
            </Button>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
