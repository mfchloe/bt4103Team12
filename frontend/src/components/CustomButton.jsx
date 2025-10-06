import React from "react";
import { Button } from "@mui/material";

const CustomButton = ({ children, sx, variant = "contained", ...props }) => {
  return (
    <Button
      variant={variant}
      sx={{
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 500,
        px: 2.5,
        py: 1,
        boxShadow: "0 4px 14px rgba(48, 93, 158, 0.25)",
        "&:hover": {
          bgcolor: "#254a7d",
          boxShadow: "0 6px 20px rgba(48, 93, 158, 0.35)",
          transform: "translateY(-2px)",
        },
        transition: "all 0.3s ease",
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
