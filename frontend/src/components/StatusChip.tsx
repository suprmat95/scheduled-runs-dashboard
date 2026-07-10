import Chip from "@mui/material/Chip";

import type { RunStatus } from "../api/types";

// Compact coloured label for a run's outcome. Null (never run) renders nothing.
export function StatusChip({ status }: { status: RunStatus | null }) {
  if (!status) return null;
  const success = status === "success";
  return (
    <Chip
      size="small"
      label={success ? "Success" : "Failed"}
      color={success ? "success" : "error"}
      variant="outlined"
      sx={{ fontWeight: 600 }}
    />
  );
}
