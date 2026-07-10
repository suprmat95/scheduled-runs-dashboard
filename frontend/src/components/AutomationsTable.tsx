import { useEffect, useMemo, useState, type MouseEvent } from "react";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
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
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import type { Automation } from "../api/types";
import { formatDateTime } from "../lib/dates";
import { StatusChip } from "./StatusChip";

type SortKey = "name" | "schedule" | "active" | "last_run_at" | "next_run_at";

interface Props {
  rows: Automation[];
  search: string;
  onSearchChange: (value: string) => void;
  onEdit: (automation: Automation) => void;
  onRecordRun: (id: number) => void;
  onDelete: (automation: Automation) => void;
}

export function AutomationsTable({
  rows,
  search,
  onSearchChange,
  onEdit,
  onRecordRun,
  onDelete,
}: Props) {
  // Client-side sort. Columns differ in kind: name is alphabetical, status is by
  // the active flag, and the date/schedule columns are chronological (Schedule
  // sorts by next_run_at — "soonest to latest"). null dates (never run / inactive)
  // always sort last, regardless of direction, so empty rows don't clutter the top.
  const [orderBy, setOrderBy] = useState<SortKey | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: SortKey) => {
    if (orderBy === field) {
      setOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(field);
      setOrder("asc");
    }
  };

  const sortedRows = useMemo(() => {
    if (!orderBy) return rows;
    const dir = order === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (orderBy === "name") return dir * a.name.localeCompare(b.name);
      if (orderBy === "active") {
        if (a.active === b.active) return 0;
        return dir * (a.active ? -1 : 1); // asc: active first
      }
      // date columns (Schedule uses the next firing time as its proximity)
      const field = orderBy === "schedule" ? "next_run_at" : orderBy;
      const x = a[field];
      const y = b[field];
      if (x === null && y === null) return 0;
      if (x === null) return 1; // nulls last, independent of direction
      if (y === null) return -1;
      return dir * (new Date(x).getTime() - new Date(y).getTime());
    });
  }, [rows, orderBy, order]);

  // Client-side pagination of the (already filtered/searched/sorted) rows. This
  // paginates only the *display*; the full list is loaded so search spans all.
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // A changed filter/search/sort can move rows around — jump back to the first
  // page so the user isn't left staring at an empty or stale one.
  useEffect(() => setPage(0), [rows, orderBy, order]);

  const pageRows = sortedRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );

  // Fixed-height scroll area (≈ a 10-row page). Because the panel height never
  // changes with the result count, the page can't reflow and the search bar
  // stays put while you type; rows beyond what fits scroll inside this area.
  const BODY_HEIGHT = 440;

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

      <TableContainer sx={{ height: BODY_HEIGHT, overflow: "auto" }}>
        <Table
          size="small"
          stickyHeader
          sx={{ "& thead th": { bgcolor: "background.paper" } }}
        >
          <TableHead>
            <TableRow>
              <TableCell sortDirection={orderBy === "name" ? order : false}>
                <TableSortLabel
                  active={orderBy === "name"}
                  direction={orderBy === "name" ? order : "asc"}
                  onClick={() => handleSort("name")}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "schedule" ? order : false}>
                <TableSortLabel
                  active={orderBy === "schedule"}
                  direction={orderBy === "schedule" ? order : "asc"}
                  onClick={() => handleSort("schedule")}
                >
                  Schedule
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "active" ? order : false}>
                <TableSortLabel
                  active={orderBy === "active"}
                  direction={orderBy === "active" ? order : "asc"}
                  onClick={() => handleSort("active")}
                >
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "last_run_at" ? order : false}>
                <TableSortLabel
                  active={orderBy === "last_run_at"}
                  direction={orderBy === "last_run_at" ? order : "asc"}
                  onClick={() => handleSort("last_run_at")}
                >
                  Last Run
                </TableSortLabel>
              </TableCell>
              <TableCell sortDirection={orderBy === "next_run_at" ? order : false}>
                <TableSortLabel
                  active={orderBy === "next_run_at"}
                  direction={orderBy === "next_run_at" ? order : "asc"}
                  onClick={() => handleSort("next_run_at")}
                >
                  Next Run
                </TableSortLabel>
              </TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} sx={{ border: 0 }}>
                  <Stack
                    spacing={1}
                    sx={{
                      alignItems: "center",
                      justifyContent: "center",
                      py: 7,
                      color: "text.secondary",
                    }}
                  >
                    <SearchOffIcon sx={{ fontSize: 44, opacity: 0.45 }} />
                    <Typography sx={{ fontWeight: 600, color: "text.primary" }}>
                      No automations found
                    </Typography>
                    <Typography variant="body2">
                      {search.trim()
                        ? `Nothing matches “${search.trim()}”.`
                        : "Try adjusting the filters above."}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((a) => (
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

      {/* Always rendered (even with 0 rows) so the panel height — and the search
          bar above it — stays put when a search yields no results. */}
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={(_, next) => setPage(next)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
      />

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
            if (menuRow) onDelete(menuRow);
            closeMenu();
          }}
        >
          Delete
        </MenuItem>
      </Menu>
    </Paper>
  );
}
