// custom form text field
import { TextField, Box } from "@mui/material";

const FormTextField = ({
  label,
  placeholder,
  value,
  onChange,
  disabled,
  type = "text",
  htmlInputProps = {},
}) => (
  <Box>
    <Box sx={styles.fieldLabel}>{label}</Box>
    <TextField
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      type={type}
      slotProps={{ htmlInput: htmlInputProps }}
      required
      fullWidth
      sx={styles.textField}
      disabled={disabled}
    />
  </Box>
);

export default FormTextField;

const styles = {
  fieldLabel: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#1a1a1a",
    mb: 1,
  },
  textField: {
    "& .MuiInputBase-root": {
      marginTop: 0,
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      fontSize: "1rem",
      "& input": {
        padding: "14px 16px",
      },
      "& fieldset": {
        borderColor: "#e5e7eb",
      },
      "&:hover fieldset": {
        borderColor: "#d1d5db",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#3b82f6",
        borderWidth: 2,
      },
    },
    "& .MuiInputBase-input::placeholder": {
      color: "#9ca3af",
      opacity: 1,
    },
  },
};
