import { useMemo } from "react";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { useAutomations, useYesterdayRuns } from "../hooks";
import { Panel } from "./Panel";
import { StatusChip } from "./StatusChip";

// Runs that actually happened yesterday, each with its automation name + outcome.
export function YesterdayRuns() {
  const { data: runs, isLoading, isError } = useYesterdayRuns();
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
      title="Yesterday's Runs"
    >
      {isLoading && <Typography color="text.secondary">Loading…</Typography>}
      {isError && <Typography color="error">Failed to load.</Typography>}
      {!isLoading && !isError && rows.length === 0 && (
        <Typography color="text.secondary">No runs yesterday.</Typography>
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
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              <RadioButtonUncheckedIcon
                fontSize="small"
                sx={{ color: "text.disabled" }}
              />
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
