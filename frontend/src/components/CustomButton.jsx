import React from "react";
import { Button } from "@mui/material";

const CustomButton = ({ children, variant = "contained", ...props }) => {
  return (
    <Button
      variant={variant}
      sx={{
        borderRadius: 2,
        textTransform: "none",
        fontWeight: 500,
        px: 2.5,
        py: 1,
      }}
      {...props}
    >
      {children}{" "}
    </Button>
  );
};

export default CustomButton;
