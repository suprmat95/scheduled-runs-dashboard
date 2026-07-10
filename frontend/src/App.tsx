import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";

import { AutomationsTable } from "./components/AutomationsTable";
import { CreateAutomationDialog } from "./components/CreateAutomationDialog";
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
  const [dialogOpen, setDialogOpen] = useState(false);

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
        <Header onCreate={() => setDialogOpen(true)} />

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
          onRecordRun={(id) => recordRun.mutate({ id })}
          onDelete={(id) => deleteAutomation.mutate(id)}
        />
      </Container>

      <CreateAutomationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </Box>
  );
}

export default App;
