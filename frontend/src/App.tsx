import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";

import type { Automation } from "./api/types";
import { AutomationDialog } from "./components/AutomationDialog";
import { AutomationsTable } from "./components/AutomationsTable";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Header } from "./components/Header";
import { KpiCards } from "./components/KpiCards";
import { useNotify } from "./components/Notifications";
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

  // Automation pending delete confirmation (null = no confirm open).
  const [deleting, setDeleting] = useState<Automation | null>(null);

  // Table filters — all applied client-side (see below).
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [successOnly, setSuccessOnly] = useState(false);

  const notify = useNotify();
  const { data: kpis } = useKpis();
  const { data: automations = [] } = useAutomations();
  const recordRun = useRecordRun();
  const deleteAutomation = useDeleteAutomation();

  const handleRecordRun = (id: number) =>
    recordRun.mutate(
      { id },
      {
        onSuccess: () => notify("Run recorded"),
        onError: () => notify("Could not record the run", "error"),
      },
    );

  const confirmDelete = () => {
    if (!deleting) return;
    const name = deleting.name;
    deleteAutomation.mutate(deleting.id, {
      onSuccess: () => {
        notify(`Deleted “${name}”`);
        setDeleting(null);
      },
      onError: () => notify("Could not delete the automation", "error"),
    });
  };

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
          onRecordRun={handleRecordRun}
          onDelete={setDeleting}
        />
      </Container>

      <AutomationDialog
        open={dialog.open}
        automation={dialog.automation}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete automation"
        message={
          <>
            Delete <strong>{deleting?.name}</strong>? This also removes its run
            history and can't be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        pending={deleteAutomation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Box>
  );
}

export default App;
