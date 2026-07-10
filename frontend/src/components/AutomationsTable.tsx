import { useState, type MouseEvent } from "react";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import SearchIcon from "@mui/icons-material/Search";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { Automation } from "../api/types";
import { formatDateTime } from "../lib/dates";
import { StatusChip } from "./StatusChip";

interface Props {
  rows: Automation[];
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (automation: Automation) => void;
  onRecordRun: (id: number) => void;
  onDelete: (id: number) => void;
}

export function AutomationsTable({
  rows,
  search,
  onSearchChange,
  onEdit,
  onRecordRun,
  onDelete,
}: Props) {
  // Row-action menu: track which row's "…" opened it.
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<Automation | null>(null);

  const openMenu = (e: MouseEvent<HTMLElement>, row: Automation) => {
    setAnchor(e.currentTarget);
    setMenuRow(row);
  };
  const closeMenu = () => {
    setAnchor(null);
    setMenuRow(null);
  };

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          mb: 2,
          justifyContent: "space-between",
          alignItems: { sm: "center" },
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          All Automations
        </Typography>
        <TextField
          size="small"
          placeholder="Search automations"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 260 }}
        />
      </Stack>

      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell>Next Run</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    No automations match your filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{a.name}</TableCell>
                <TableCell>{a.schedule_display}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={a.active ? "Active" : "Inactive"}
                    color={a.active ? "primary" : "default"}
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      component="span"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {formatDateTime(a.last_run_at)}
                    </Box>
                    <StatusChip status={a.last_run_status} />
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatDateTime(a.next_run_at)}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={(e) => openMenu(e, a)}>
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            if (menuRow) onEdit(menuRow);
            closeMenu();
          }}
        >
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuRow) onRecordRun(menuRow.id);
            closeMenu();
          }}
        >
          Record run now
        </MenuItem>
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            if (menuRow) onDelete(menuRow.id);
            closeMenu();
          }}
        >
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
}
