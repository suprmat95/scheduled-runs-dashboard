import { createTheme } from "@mui/material/styles";

// A light, clean SaaS look close to the mockup: soft grey background, white
// cards, a single indigo accent.
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#4f46e5" },
    success: { main: "#16a34a" },
    error: { main: "#dc2626" },
    background: { default: "#f5f6fa", paper: "#ffffff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { border: "1px solid #ecedf2" },
      },
      defaultProps: { elevation: 0 },
    },
  },
});
