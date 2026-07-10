import { api } from "./client";
import type {
  Automation,
  AutomationRun,
  CreateAutomationInput,
  Kpis,
  MatchingResponse,
  Paginated,
} from "./types";

// Thin, typed wrappers around the backend endpoints. Kept dumb on purpose —
// caching / refetching lives in the React Query hooks that call these.

export async function fetchKpis(): Promise<Kpis> {
  const { data } = await api.get<Kpis>("/automations/kpis/");
  return data;
}

// The dashboard filters/searches/paginates client-side, so it needs the full
// list. The backend caps page_size at 200, so we walk the pages until there's
// no `next` — no silent truncation, and correct however many rows exist.
// (For very large datasets this is where you'd switch to server-side; see the
// README's design notes.)
export async function fetchAutomations(): Promise<Automation[]> {
  const all: Automation[] = [];
  let page = 1;
  for (;;) {
    const { data } = await api.get<Paginated<Automation>>("/automations/", {
      params: { page, page_size: 200 },
    });
    all.push(...data.results);
    if (!data.next) break;
    page += 1;
  }
  return all;
}

export async function fetchMatching(date?: string): Promise<MatchingResponse> {
  const { data } = await api.get<MatchingResponse>("/automations/matching/", {
    params: date ? { date } : undefined,
  });
  return data;
}

export async function fetchRuns(date?: string): Promise<AutomationRun[]> {
  const { data } = await api.get<Paginated<AutomationRun> | AutomationRun[]>(
    "/runs/",
    { params: date ? { date } : undefined },
  );
  // /runs/ is paginated too; tolerate either shape.
  return Array.isArray(data) ? data : data.results;
}

export async function createAutomation(
  input: CreateAutomationInput,
): Promise<Automation> {
  const { data } = await api.post<Automation>("/automations/", input);
  return data;
}

export async function updateAutomation(
  id: number,
  input: CreateAutomationInput,
): Promise<Automation> {
  const { data } = await api.patch<Automation>(`/automations/${id}/`, input);
  return data;
}

export async function recordRun(
  id: number,
  status: "success" | "failed" = "success",
): Promise<AutomationRun> {
  const { data } = await api.post<AutomationRun>(`/automations/${id}/run/`, {
    status,
  });
  return data;
}

export async function deleteAutomation(id: number): Promise<void> {
  await api.delete(`/automations/${id}/`);
}
