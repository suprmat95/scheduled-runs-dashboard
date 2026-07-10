import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAutomation,
  deleteAutomation,
  fetchAutomations,
  fetchKpis,
  fetchMatching,
  fetchRuns,
  recordRun,
} from "../api/automations";
import { todayIso, yesterdayIso } from "../lib/dates";

// Central query keys so invalidation after a mutation stays consistent.
export const keys = {
  kpis: ["kpis"] as const,
  automations: ["automations"] as const,
  matching: (date: string) => ["matching", date] as const,
  runs: (date: string) => ["runs", date] as const,
};

export function useKpis() {
  return useQuery({ queryKey: keys.kpis, queryFn: fetchKpis });
}

export function useAutomations() {
  return useQuery({ queryKey: keys.automations, queryFn: fetchAutomations });
}

export function useTodaySchedule() {
  const date = todayIso();
  return useQuery({
    queryKey: keys.matching(date),
    queryFn: () => fetchMatching(date),
  });
}

export function useYesterdayRuns() {
  const date = yesterdayIso();
  return useQuery({
    queryKey: keys.runs(date),
    queryFn: () => fetchRuns(date),
  });
}

// Any write to automations/runs can change the list, KPIs and the schedule/runs
// lists, so refetch all of them. Centralized so every mutation stays consistent.
function invalidateDashboard(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: keys.automations });
  qc.invalidateQueries({ queryKey: keys.kpis });
  qc.invalidateQueries({ queryKey: ["matching"] });
  qc.invalidateQueries({ queryKey: ["runs"] });
}

export function useCreateAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createAutomation,
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useRecordRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status?: "success" | "failed" }) =>
      recordRun(id, status),
    onSuccess: () => invalidateDashboard(qc),
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAutomation(id),
    onSuccess: () => invalidateDashboard(qc),
  });
}
