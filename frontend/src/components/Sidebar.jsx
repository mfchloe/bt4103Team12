import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Drawer,
  List,
  Typography,
  IconButton,
  Tooltip,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
} from "@mui/material";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { navItems } from "../constants/navItems";
import { useAuth } from "../context/AuthContext.jsx";

// subcomponents //

// HEADER
const SidebarHeader = ({ collapsed, toggleCollapse }) => (
  <Box sx={styles.drawerHeader}>
    {!collapsed && (
      <Typography variant="h5" sx={styles.headerTitle}>
        Capstone!
      </Typography>
    )}
    <IconButton onClick={toggleCollapse} sx={styles.collapseButton}>
      {collapsed ? <ChevronRight /> : <ChevronLeft />}
    </IconButton>
  </Box>
);

// SIDEBAR ITEMS
const SidebarNavItem = ({ item, collapsed, isActive, onNavigate }) => {
  const IconComponent = item.icon;

  return (
    <Tooltip
      title={collapsed ? item.label : ""}
      placement="right"
      arrow
      key={item.path}
    >
      <ListItem sx={styles.navItem} disablePadding>
        {/* button  */}
        <ListItemButton
          onClick={() => onNavigate(item.path)}
          sx={{
            ...styles.navButton,
            ...(isActive ? styles.activeNavButton : {}),
          }}
        >
          {/* icon */}
          <ListItemIcon sx={styles.navIcon}>
            <IconComponent size={20} />
          </ListItemIcon>
          {/* nav item title */}

          {!collapsed && (
            <ListItemText
              disableTypography
              primary={
                <Typography sx={styles.navText}>{item.label}</Typography>
              }
            />
          )}
        </ListItemButton>
      </ListItem>
    </Tooltip>
  );
};

// MAIN COMPONENT//
const Sidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const handleNavigation = (path) => {
    if (path === "/" && !isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate(path);
  };
  const toggleCollapse = () => setCollapsed((prev) => !prev);

  return (
    <Drawer
      variant="permanent"
      sx={{
        "& .MuiDrawer-paper": {
          width: collapsed ? 80 : 280,
          transition: "width 0.3s ease",
          overflowX: "hidden",
          ...styles.drawerPaper,
        },
      }}
    >
      <SidebarHeader collapsed={collapsed} toggleCollapse={toggleCollapse} />

      <List sx={styles.navList}>
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            collapsed={collapsed}
            isActive={location.pathname === item.path}
            onNavigate={handleNavigation}
          />
        ))}
      </List>

      <Box sx={styles.footer}>
        {isAuthenticated ? (
          <Button
            variant="outlined"
            color="inherit"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            sx={{
              ...styles.footerButton,
              borderColor: "rgba(255,255,255,0.7)",
              color: "white",
              "&:hover": { borderColor: "white" },
            }}
          >
            Log Out
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => navigate("/login")}
            sx={{
              ...styles.footerButton,
              bgcolor: "white",
              color: "#305D9E",
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
          >
            Log In
          </Button>
        )}
      </Box>
    </Drawer>
  );
};

export default Sidebar;

// --- Styles --- //
const styles = {
  drawerPaper: {
    bgcolor: "#305D9E",
    color: "white",
    boxShadow: "2px 0 8px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  drawerHeader: {
    p: 3,
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontWeight: "bold",
    color: "white",
  },
  collapseButton: {
    color: "white",
    ml: "auto",
  },
  navList: {
    px: 1.5,
    py: 3,
    flexGrow: 1,
  },
  navItem: {
    mb: 1,
  },
  navButton: {
    borderRadius: 2,
    color: "white",
    py: 1.5,
    px: 2,
    transition: "all 0.2s ease",
    "&:hover": {
      bgcolor: "rgba(255, 255, 255, 0.1)",
      transform: "translateX(4px)",
    },
  },
  activeNavButton: {
    bgcolor: "#DBE9EE",
    borderRadius: "12px",
    color: "#305D9E",
    "&:hover": {
      bgcolor: "#d0e2e8",
    },
  },
  navIcon: {
    color: "inherit",
    minWidth: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  navText: {
    fontWeight: 500,
    fontSize: "1rem",
    color: "inherit",
  },
  footer: {
    p: 2,
    borderTop: "1px solid rgba(255,255,255,0.2)",
    display: "flex",
    justifyContent: "center",
  },
  footerButton: {
    textTransform: "none",
    fontWeight: 600,
    width: "100%",
    borderRadius: 2,
    boxShadow: "none",
  },
};
