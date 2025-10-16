import React from "react";
import { Button } from "@mui/material";

const CustomButton = ({ children, sx = {}, variant = "contained", ...props }) => {
  return (
    <Button
      variant={variant}
      sx={{
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 500,
        px: 2.5,
        py: 1,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Button>
  );
};

export default CustomButton;
