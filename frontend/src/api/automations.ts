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

// The dashboard filters/searches client-side, so we pull the full list in one
// page (the dataset is small). page_size is capped at 200 by the backend.
export async function fetchAutomations(): Promise<Automation[]> {
  const { data } = await api.get<Paginated<Automation>>("/automations/", {
    params: { page_size: 200 },
  });
  return data.results;
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
