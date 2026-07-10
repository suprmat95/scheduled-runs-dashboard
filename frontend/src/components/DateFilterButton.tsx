import { useState } from "react";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

interface Quick {
  label: string;
  value: string;
}

interface Props {
  date: string;
  onChange: (date: string) => void;
  // Optional shortcut dates (e.g. Today / Yesterday) shown as quick buttons and
  // used to label the trigger when the current date matches one of them.
  quick?: Quick[];
}

// A clearly-clickable date control: an outlined "📅 <label> ▾" button that opens
// a popover with a native date picker plus optional quick-jump shortcuts.
export function DateFilterButton({ date, onChange, quick = [] }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const close = () => setAnchorEl(null);
  const label = quick.find((q) => q.value === date)?.label ?? date;

  const pick = (value: string) => {
    onChange(value);
    close();
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<CalendarTodayIcon fontSize="small" />}
        endIcon={<ArrowDropDownIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          textTransform: "none",
          color: "text.secondary",
          borderColor: "divider",
        }}
      >
        {label}
      </Button>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Stack spacing={1.5} sx={{ p: 2 }}>
          <TextField
            type="date"
            size="small"
            label="Pick a date"
            value={date}
            autoFocus
            onChange={(e) => e.target.value && pick(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {quick.length > 0 && (
            <Stack direction="row" spacing={1}>
              {quick.map((q) => (
                <Button key={q.value} size="small" onClick={() => pick(q.value)}>
                  {q.label}
                </Button>
              ))}
            </Stack>
          )}
        </Stack>
      </Popover>
    </>
  );
}
