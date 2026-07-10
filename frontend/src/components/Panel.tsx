import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface Props {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}

// Titled white card used by the two dashboard lists and the table section.
export function Panel({ icon, title, children }: Props) {
  return (
    <Paper sx={{ p: 2.5, flex: 1, minWidth: 0 }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 1.5, alignItems: "center" }}
      >
        <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}
