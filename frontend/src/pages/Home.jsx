import React from "react";
import { Box, Typography, Grid, Button } from "@mui/material";
import { TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import StatCard from "../components/StatCard";
import PortfolioTable from "../components/home/PortfolioTable";

const Home = () => {
  const handleRecommendClick = () => alert("Recommendations coming soon!");

  // TEMPORARY..
  const statItems = [
    {
      title: "Total Portfolio Value",
      value: "$28,450",
      icon: DollarSign,
      trend: 5.2,
    },
    {
      title: "Today's P&L",
      value: "+$1,250",
      icon: TrendingUp,
      trend: 2.1,
    },
    {
      title: "Total Return",
      value: "+15.8%",
      icon: BarChart3,
      trend: 15.8,
    },
  ];

  return (
    <Box>
      {/* MY STATS SECTION */}
      <Typography sx={styles.pageTitle}>My stats</Typography>

      {/* stat cards */}
      <Grid container spacing={3} mb={6}>
        {statItems.map((item, idx) => (
          <Grid item xs={12} md={4} key={idx}>
            <StatCard
              title={item.title}
              value={item.value}
              icon={item.icon}
              trend={item.trend}
            />
          </Grid>
        ))}
      </Grid>

      {/* graphs placeholder */}
      <Box sx={[styles.graphsContainer, styles.card]}>
        <Typography sx={styles.placeholderText}>Graphs placeholder</Typography>
      </Box>

      {/* MY PORTFOLIO */}
      <Typography sx={styles.sectionTitle}>My Portfolio</Typography>
      <PortfolioTable />

      {/* recommend button */}
      <Box sx={styles.recommendButtonContainer}>
        <Button sx={styles.recommendButton} onClick={handleRecommendClick}>
          Recommend
        </Button>
      </Box>
    </Box>
  );
};

export default Home;

const styles = {
  pageTitle: {
    color: "#305D9E",
    fontWeight: "bold",
    fontSize: "2rem",
    mb: 4,
  },
  sectionTitle: {
    color: "#305D9E",
    fontWeight: "bold",
    fontSize: "1.75rem",
    mt: 6,
    mb: 3,
  },
  graphsContainer: {
    p: 3,
    minHeight: 220,
    mb: 6,
  },
  card: {
    borderRadius: "12px",
    backgroundColor: "white",
  },
  recommendButtonContainer: {
    display: "flex",
    justifyContent: "center",
    mt: 6,
  },
  recommendButton: {
    bgcolor: "#2E8B8B",
    color: "white",
    fontWeight: "bold",
    px: 4,
    py: 1.5,
    borderRadius: "10px",
    fontSize: "1rem",
    textTransform: "none",
    "&:hover": {
      bgcolor: "#267373",
    },
  },
  placeholderText: {
    color: "#9ca3af",
    fontStyle: "italic",
  },
};
