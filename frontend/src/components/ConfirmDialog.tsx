import type { ReactNode } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

interface Props {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Generic yes/no confirmation, used to guard the (irreversible) delete action.
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  destructive,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={pending ? undefined : onCancel} maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={destructive ? "error" : "primary"}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? "Working…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
