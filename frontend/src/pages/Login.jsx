import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", fullName: "", customerId: "" });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, register, farCustomerLogin, isAuthenticated, loading } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = useMemo(
    () => location.state?.from?.pathname || "/",
    [location.state]
  );

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, redirectPath]);

  const handleTabChange = (_event, value) => {
    setMode(value);
    setError(null);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else if (mode === "register") {
        if (form.password.length < 8) {
          throw new Error("Password must be at least 8 characters long.");
        }
        await register(form.email, form.password, form.fullName || undefined);
      } else if (mode === "far_customer") {
        if (!form.customerId.trim()) {
          throw new Error("Please enter a valid Customer ID.");
        }
        await farCustomerLogin(form.customerId.trim());
      }

      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(
        err?.payload?.detail || err.message || "Unable to complete request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const titleByMode = {
    login: "Sign in",
    register: "Create account",
    far_customer: "Customer ID Login",
  }

  const descByMode = {
    login: "Sign in to view your personalised portfolio and track your stocks.",
    register: "Register to start building your personalised portfolio.",
    far_customer: "Use a Customer ID to explore the app as an existing anonymised customer.",
  };

  return (
    <Box sx={styles.page}>
      <Card sx={styles.card}>
        <CardContent sx={styles.cardContent}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, mb: 1 }}
          >
            {titleByMode[mode]}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {descByMode[mode]}
          </Typography>

          <Tabs value={mode} onChange={handleTabChange} sx={styles.tabs}>
            <Tab label="Sign In" value="login" />
            <Tab label="Create Account" value="register" />
            <Tab label="Far Customer" value="far_customer" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={styles.form}>
            {mode === "register" && (
              <TextField
                label="Full Name"
                name="fullName"
                value={form.fullName}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                disabled={submitting}
              />
            )}

            {mode !== "far_customer" && (
              <>
                <TextField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  margin="normal"
                  disabled={submitting}
                />
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  margin="normal"
                  helperText={
                    mode === "register"
                      ? "Use at least 8 characters for a strong password."
                      : ""
                  }
                  disabled={submitting}
                />
              </>
            )}

            {mode === "far_customer" && (
              <TextField
                label="Customer ID"
                name="customerId"
                value={form.customerId}
                onChange={handleInputChange}
                required
                fullWidth
                margin="normal"
                disabled={submitting}
                helperText="Use Customer ID from the dataset"
              />
            )}


            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              sx={{ mt: 2 }}
              disabled={submitting}
            >
              {mode === "register" ? "Create Account" : "Sign In"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    bgcolor: "#f3f4f6",
    px: 2,
  },
  card: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 3,
    boxShadow: "0 20px 80px rgba(15, 23, 42, 0.15)",
  },
  cardContent: {
    p: { xs: 3, md: 4 },
  },
  tabs: {
    mb: 2,
    "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
  },
  form: {
    mt: 1,
  },
};

export default Login;
