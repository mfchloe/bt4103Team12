import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

export default function SearchBar({ value, onChange, placeholder, disabled }) {
  return (
    <TextField
      variant="outlined"
      placeholder={placeholder || "Search"}
      size="small"
      value={value}
      onChange={onChange}
      fullWidth
      disabled={disabled}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        sx: {
          borderRadius: "12px",
          backgroundColor: "#fff",
        },
      }}
    />
  );
}
