import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import Alert, { type AlertColor } from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

// Lightweight global toast: `const notify = useNotify(); notify("Saved")`.
// One snackbar at a time is plenty for this dashboard's mutations.
type Notify = (message: string, severity?: AlertColor) => void;

const NotifyContext = createContext<Notify>(() => {});

export const useNotify = () => useContext(NotifyContext);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("success");

  const notify = useCallback<Notify>((msg, sev = "success") => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setOpen(false)}
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </NotifyContext.Provider>
  );
}
