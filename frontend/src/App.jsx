// layout component that wraps pages with sidebar
import React, { useState } from "react";
import { Box } from "@mui/material";
import Sidebar from "./components/Sidebar";

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box sx={styles.appContainer}>
      {/* pass collapsed + toggle down to Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <Box
        component="main"
        sx={{
          ...styles.mainContent,
          ml: collapsed ? "80px" : "280px", // shift depending on sidebar
          transition: "margin-left 0.3s ease",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;

const styles = {
  appContainer: {
    display: "flex",
    minHeight: "100vh",
    bgcolor: "#f5f5f5",
  },
  mainContent: {
    flexGrow: 1,
    p: 4,
  },
};
