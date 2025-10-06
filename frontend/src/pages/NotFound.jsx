import { Box, Typography, Button, Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import CustomButton from "../components/CustomButton";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box sx={styles.container}>
        <Box sx={styles.contentContainer}>
          {/* icon */}
          <Box sx={styles.iconContainer}>
            <TrendingUp size={60} color="white" />
          </Box>

          {/* 404 Text */}
          <Typography variant="h1" sx={styles.headerText}>
            404
          </Typography>

          {/* message */}
          <Typography variant="h5" sx={styles.messageText}>
            Page Not Found
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              maxWidth: 400,
              mb: 2,
            }}
          >
            Oops! The page you're looking for seems to have wandered off. Let's
            get you back on track to managing your portfolio.
          </Typography>

          {/* button */}
          <CustomButton
            onClick={() => navigate("/")}
            sx={{
              bgcolor: "#305D9E",
              color: "white",
              px: 4,
              py: 1.5,
              fontSize: "1rem",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Back to Portfolio
          </CustomButton>
        </Box>
      </Box>
    </Box>
  );
};

export default NotFound;

const styles = {
  container: {
    bgcolor: "background.default",
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "85vh",
    width: "100%",
  },
  contentContainer: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 3,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    bgcolor: "#305D9E",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 32px rgba(48, 93, 158, 0.2)",
  },
  headerText: {
    fontSize: { xs: "4rem", md: "6rem" },
    fontWeight: "bold",
    color: "#305D9E",
    lineHeight: 1,
    mb: 2,
  },
  messageText: {
    fontWeight: 600,
    color: "#2E8B8B",
    mb: 1,
  },
};
