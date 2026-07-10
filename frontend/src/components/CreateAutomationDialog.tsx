import { useState } from "react";
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

import { useCreateAutomation } from "../hooks";
import {
  REPETITION_OPTIONS,
  repetitionToCrontab,
  type Repetition,
} from "../lib/cron";

interface Props {
  open: boolean;
  onClose: () => void;
}

// A local datetime-local value ("YYYY-MM-DDTHH:MM") for the default field value.
function defaultStart(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function CreateAutomationDialog({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [repetition, setRepetition] = useState<Repetition>("daily");
  const [startDate, setStartDate] = useState(defaultStart);
  const [active, setActive] = useState(true);

  const create = useCreateAutomation();

  const reset = () => {
    setName("");
    setRepetition("daily");
    setStartDate(defaultStart());
    setActive(true);
    create.reset();
  };

  const handleClose = () => {
    if (create.isPending) return;
    reset();
    onClose();
  };

  const handleSubmit = () => {
    const start = new Date(startDate);
    create.mutate(
      {
        name: name.trim(),
        crontab: repetitionToCrontab(repetition, start),
        start_date: start.toISOString(),
        active,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  };

  const canSubmit = name.trim().length > 0 && startDate.length > 0;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>
        Create Automation
        <Typography variant="body2" color="text.secondary">
          Fill in the form below to create a new automation
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
          {create.isError && (
            <Alert severity="error">
              Could not create the automation. Please try again.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={create.isPending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit || create.isPending}
        >
          {create.isPending ? "Creating…" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
