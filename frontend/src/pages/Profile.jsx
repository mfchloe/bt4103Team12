import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Slider,
  Alert,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "../context/AuthContext.jsx";
import { db } from "../../firebase.jsx";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  INVESTOR_TYPES,
  CUSTOMER_TYPES,
  RISK_LEVELS,
  CAPACITY,
} from "../constants/profile";

const Profile = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [investorType, setInvestorType] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [divScore, setDivScore] = useState(0.5);
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, "users", currentUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setInvestorType(data.investorType || "");
          setCustomerType(data.customerType || "");
          setRiskLevel(data.riskLevel || "");
          setDivScore(
            typeof data.diversificationScore === "number"
              ? data.diversificationScore
              : 0.5
          );
          setCapacity(data.investmentCapacity || "");
        }
      } catch (e) {
        setError(e?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, currentUser?.uid]);

  const isValid =
    investorType &&
    customerType &&
    riskLevel &&
    capacity &&
    typeof divScore === "number" &&
    divScore >= 0 &&
    divScore <= 1;

  const handleUpdateProfile = async () => {
    if (!isValid || !currentUser?.uid) return;

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const ref = doc(db, "users", currentUser.uid);
      const docData = {
        investorType,
        customerType,
        riskLevel,
        diversificationScore: Number(divScore),
        investmentCapacity: capacity,
        profileCompleted: true,
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, docData, { merge: true });
      setSuccessMessage("Profile updated successfully!");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      setError(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Box sx={styles.container}>
        <Alert severity="warning">Please log in to view your profile.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={styles.container}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Typography variant="h4" sx={styles.header}>
          My Profile
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {successMessage}
          </Alert>
        )}

        {loading ? (
          <Box sx={styles.loader}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: "grid", gap: 3 }}>
            {/* Trading Style Section */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: "white",
                borderRadius: 3,
                boxShadow: 1,
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Trading Style
              </Typography>

              <FormControl fullWidth>
                <InputLabel id="investorType-label">
                  How often do you trade?
                </InputLabel>
                <Select
                  labelId="investorType-label"
                  label="How often do you trade?"
                  value={investorType}
                  onChange={(e) => setInvestorType(e.target.value)}
                >
                  {INVESTOR_TYPES.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box>
                        <Typography variant="body1">{opt.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {opt.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* Risk & Strategy Section */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: "white",
                borderRadius: 3,
                boxShadow: 1,
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Risk & Strategy
              </Typography>

              <Box sx={{ display: "grid", gap: 3 }}>
                <FormControl fullWidth>
                  <InputLabel id="riskLevel-label">
                    What's your risk tolerance?
                  </InputLabel>
                  <Select
                    labelId="riskLevel-label"
                    label="What's your risk tolerance?"
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                  >
                    {RISK_LEVELS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            width: "100%",
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: opt.color,
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1">{opt.label}</Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {opt.description}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>
                    Portfolio diversification preference
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 2 }}
                  >
                    Would you prefer to concentrate in fewer investments or
                    spread across many?
                  </Typography>
                  <Slider
                    value={divScore}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(_, v) => setDivScore(v)}
                    marks={[
                      { value: 0, label: "Focused" },
                      { value: 0.5, label: "Balanced" },
                      { value: 1, label: "Diversified" },
                    ]}
                    sx={{
                      mx: "auto",
                      "& .MuiSlider-markLabel": {
                        fontSize: "0.7rem",
                        color: "text.secondary",
                      },
                    }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* Account & Capacity Section */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: "white",
                borderRadius: 3,
                boxShadow: 1,
              }}
            >
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Account Details
              </Typography>

              <Box sx={{ display: "grid", gap: 3 }}>
                <FormControl fullWidth>
                  <InputLabel id="capacity-label">
                    Investment capacity
                  </InputLabel>
                  <Select
                    labelId="capacity-label"
                    label="Investment capacity"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  >
                    {CAPACITY.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Box>
                          <Typography variant="body1">{opt.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {opt.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel id="customerType-label">
                    How do you see yourself?
                  </InputLabel>
                  <Select
                    labelId="customerType-label"
                    label="How do you see yourself?"
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                  >
                    {CUSTOMER_TYPES.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Box>
                          <Typography variant="body1">{opt.label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {opt.description}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>

            {/* Update Button */}
            <Box sx={styles.buttonContainer}>
              <Button
                onClick={handleUpdateProfile}
                disabled={!isValid || saving}
                sx={styles.updateButton}
              >
                {saving ? "Updating..." : "Update Profile"}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Profile;

const styles = {
  container: {
    minHeight: "100vh",
    p: 3,
  },
  header: {
    fontWeight: "bold",
    color: "#305D9E",
    mb: 4,
  },
  loader: {
    bgcolor: "white",
    borderRadius: 3,
    boxShadow: 1,
    py: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    mt: 2,
    mb: 4,
  },
  updateButton: {
    bgcolor: "#305D9E",
    color: "white",
    px: 4,
    py: 1.5,
    "&:hover": { bgcolor: "#254a7d" },
    "&:disabled": { bgcolor: "#cccccc" },
  },
};
