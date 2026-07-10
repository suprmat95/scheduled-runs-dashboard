import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { Automation } from "../api/types";
import { useCreateAutomation, useUpdateAutomation } from "../hooks";
import { useNotify } from "./Notifications";
import {
  REPETITION_OPTIONS,
  crontabToForm,
  repetitionToCrontab,
  type Repetition,
} from "../lib/cron";
import { toDatetimeLocal } from "../lib/dates";

interface Props {
  open: boolean;
  onClose: () => void;
  // When set, the dialog edits this automation; otherwise it creates a new one.
  automation?: Automation | null;
}

function defaultStart(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return toDatetimeLocal(d);
}

export function AutomationDialog({ open, onClose, automation }: Props) {
  const isEdit = Boolean(automation);

  const [name, setName] = useState("");
  const [repetition, setRepetition] = useState<Repetition>("daily");
  const [startDate, setStartDate] = useState(defaultStart);
  const [active, setActive] = useState(true);

  const notify = useNotify();
  const create = useCreateAutomation();
  const update = useUpdateAutomation();
  const mutation = isEdit ? update : create;

  // Populate the form whenever the dialog opens: from the automation in edit
  // mode (reverse-mapping the crontab), or blank defaults in create mode.
  useEffect(() => {
    if (!open) return;
    if (automation) {
      const form = crontabToForm(automation.crontab, automation.start_date);
      setName(automation.name);
      setRepetition(form?.repetition ?? "daily");
      setStartDate(form ? toDatetimeLocal(form.startDate) : defaultStart());
      setActive(automation.active);
    } else {
      setName("");
      setRepetition("daily");
      setStartDate(defaultStart());
      setActive(true);
    }
    create.reset();
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, automation]);

  const handleClose = () => {
    if (mutation.isPending) return;
    onClose();
  };

  const handleSubmit = () => {
    const start = new Date(startDate);
    const input = {
      name: name.trim(),
      crontab: repetitionToCrontab(repetition, start),
      start_date: start.toISOString(),
      active,
    };
    const onSuccess = () => {
      notify(isEdit ? "Automation updated" : "Automation created");
      onClose();
    };
    if (isEdit && automation) {
      update.mutate({ id: automation.id, input }, { onSuccess });
    } else {
      create.mutate(input, { onSuccess });
    }
  };

  const canSubmit = name.trim().length > 0 && startDate.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>
        {isEdit ? "Edit Automation" : "Create Automation"}
        <Typography variant="body2" color="text.secondary">
          {isEdit
            ? "Update the automation's details below"
            : "Fill in the form below to create a new automation"}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Repetition"
            select
            value={repetition}
            onChange={(e) => setRepetition(e.target.value as Repetition)}
            fullWidth
          >
            {REPETITION_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Start Date"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="The time sets when the automation fires."
          />
          <FormControlLabel
            control={
              <Switch
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
            }
            label="Active"
          />
          {mutation.isError && (
            <Alert severity="error">
              Could not save the automation. Please try again.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || mutation.isPending}
        >
          {mutation.isPending
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
