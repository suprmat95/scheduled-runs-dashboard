import type { ReactNode } from "react";
import AppsIcon from "@mui/icons-material/Apps";
import BoltIcon from "@mui/icons-material/Bolt";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import type { Kpis } from "../api/types";

interface CardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

function KpiCard({ icon, label, value, active, onClick }: CardProps) {
  const clickable = Boolean(onClick);
  return (
    <Paper
      onClick={onClick}
      sx={{
        p: 2.5,
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 2,
        cursor: clickable ? "pointer" : "default",
        borderColor: active ? "primary.main" : undefined,
        boxShadow: active ? "0 0 0 1px var(--mui-palette-primary-main)" : undefined,
        transition: "border-color .15s, box-shadow .15s",
        "&:hover": clickable ? { borderColor: "primary.light" } : undefined,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          bgcolor: "#eef0fb",
          color: "primary.main",
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5">{value}</Typography>
      </Box>
    </Paper>
  );
}

interface Props {
  kpis?: Kpis;
  activeFilter: boolean;
  successFilter: boolean;
  onShowAll: () => void;
  onToggleActive: () => void;
  onToggleSuccess: () => void;
}

export function KpiCards({
  kpis,
  activeFilter,
  successFilter,
  onShowAll,
  onToggleActive,
  onToggleSuccess,
}: Props) {
  const dash = "—";
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3 }}>
      <KpiCard
        icon={<AppsIcon />}
        label="Total Automations"
        value={kpis?.total_automations ?? dash}
        // Highlighted when no filter narrows the table — i.e. all are shown.
        active={!activeFilter && !successFilter}
        onClick={onShowAll}
      />
      <KpiCard
        icon={<BoltIcon />}
        label="Active Schedules"
        value={kpis?.active_schedules ?? dash}
        active={activeFilter}
        onClick={onToggleActive}
      />
      <KpiCard
        icon={<CheckCircleOutlineIcon />}
        label="Success Rate"
        value={kpis ? `${kpis.success_rate}%` : dash}
        active={successFilter}
        onClick={onToggleSuccess}
      />
    </Stack>
  );
}
