import { useMemo, useState } from "react";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import ScheduleIcon from "@mui/icons-material/Schedule";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useAutomations, useRuns } from "../hooks";
import { todayIso, yesterdayIso } from "../lib/dates";
import { DateFilterButton } from "./DateFilterButton";
import { Panel } from "./Panel";
import { StatusChip } from "./StatusChip";

// Runs that actually happened on the selected day (yesterday by default).
export function YesterdayRuns() {
  const [date, setDate] = useState(yesterdayIso());
  const { data: runs, isLoading, isError } = useRuns(date);
  const { data: automations } = useAutomations();

  // Runs reference their automation by id; resolve names from the list we
  // already have cached instead of an extra request per run.
  const nameById = useMemo(() => {
    const map = new Map<number, string>();
    (automations ?? []).forEach((a) => map.set(a.id, a.name));
    return map;
  }, [automations]);

  const rows = runs ?? [];

  return (
    <Panel
      icon={<EventAvailableIcon fontSize="small" />}
      title="Runs"
      action={
        <DateFilterButton
          date={date}
          onChange={setDate}
          quick={[
            { label: "Yesterday", value: yesterdayIso() },
            { label: "Today", value: todayIso() },
          ]}
        />
      }
    >
      {isLoading && <Typography color="text.secondary">Loading…</Typography>}
      {isError && <Typography color="error">Failed to load.</Typography>}
      {!isLoading && !isError && rows.length === 0 && (
        <Typography color="text.secondary">No runs on this day.</Typography>
      )}
      <Stack divider={<Divider flexItem />}>
        {rows.map((run) => (
          <Stack
            key={run.id}
            direction="row"
            sx={{
              py: 1.25,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <ScheduleIcon fontSize="small" sx={{ color: "text.disabled" }} />
              <Typography>
                {nameById.get(run.automation) ?? `#${run.automation}`}
              </Typography>
            </Stack>
            <StatusChip status={run.status} />
          </Stack>
        ))}
      </Stack>
    </Panel>
  );
}
