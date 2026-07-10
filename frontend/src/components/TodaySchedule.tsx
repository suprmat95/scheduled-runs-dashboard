import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ScheduleIcon from "@mui/icons-material/Schedule";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useTodaySchedule } from "../hooks";
import { formatTime } from "../lib/dates";
import { Panel } from "./Panel";

// Active automations scheduled to fire today, with their firing time.
export function TodaySchedule() {
  const { data, isLoading, isError } = useTodaySchedule();
  const rows = data?.results ?? [];

  return (
    <Panel icon={<CalendarTodayIcon fontSize="small" />} title="Today's Schedule">
      {isLoading && <Typography color="text.secondary">Loading…</Typography>}
      {isError && <Typography color="error">Failed to load.</Typography>}
      {!isLoading && !isError && rows.length === 0 && (
        <Typography color="text.secondary">Nothing scheduled today.</Typography>
      )}
      <Stack divider={<Divider flexItem />}>
        {rows.map((a) => (
          <Stack
            key={a.id}
            direction="row"
            sx={{
              py: 1.25,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              <ScheduleIcon fontSize="small" sx={{ color: "text.disabled" }} />
              <Typography>{a.name}</Typography>
            </Stack>
            <Box component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
              <Typography color="text.secondary">
                {formatTime(a.matched_at)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Panel>
  );
}
