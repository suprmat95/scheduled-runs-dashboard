import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";

import type { Automation } from "./api/types";
import { AutomationDialog } from "./components/AutomationDialog";
import { AutomationsTable } from "./components/AutomationsTable";
import { Header } from "./components/Header";
import { KpiCards } from "./components/KpiCards";
import { TodaySchedule } from "./components/TodaySchedule";
import { YesterdayRuns } from "./components/YesterdayRuns";
import {
  useAutomations,
  useDeleteAutomation,
  useKpis,
  useRecordRun,
} from "./hooks";
import { matchesSearch } from "./lib/search";

function App() {
  // The dialog does double duty: `automation: null` -> create, otherwise edit.
  const [dialog, setDialog] = useState<{
    open: boolean;
    automation: Automation | null;
  }>({ open: false, automation: null });

  // Table filters — all applied client-side (see below).
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [successOnly, setSuccessOnly] = useState(false);

  const { data: kpis } = useKpis();
  const { data: automations = [] } = useAutomations();
  const recordRun = useRecordRun();
  const deleteAutomation = useDeleteAutomation();

  // The KPI-box clicks and the search box all narrow the same list in the
  // browser: with a small dataset this is instant and lets the search span
  // every displayed field (incl. formatted dates) exactly as required.
  const rows = useMemo(
    () =>
      automations
        .filter((a) => (activeOnly ? a.active : true))
        .filter((a) => (successOnly ? a.last_run_status === "success" : true))
        .filter((a) => matchesSearch(a, search)),
    [automations, activeOnly, successOnly, search],
  );

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh", py: 4 }}>
      <Container maxWidth="lg">
        <Header
          onCreate={() => setDialog({ open: true, automation: null })}
        />

        <KpiCards
          kpis={kpis}
          activeFilter={activeOnly}
          successFilter={successOnly}
          onToggleActive={() => setActiveOnly((v) => !v)}
          onToggleSuccess={() => setSuccessOnly((v) => !v)}
        />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <TodaySchedule />
          <YesterdayRuns />
        </Stack>

        <AutomationsTable
          rows={rows}
          search={search}
          onSearchChange={setSearch}
          onEdit={(automation) => setDialog({ open: true, automation })}
          onRecordRun={(id) => recordRun.mutate({ id })}
          onDelete={(id) => deleteAutomation.mutate(id)}
        />
      </Container>

      <AutomationDialog
        open={dialog.open}
        automation={dialog.automation}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </Box>
  );
}

export default App;
