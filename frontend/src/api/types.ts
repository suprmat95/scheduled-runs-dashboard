// Shapes returned by the Django/DRF backend. Kept in one place so the API layer
// and the UI agree on the contract.

export type RunStatus = "success" | "failed";

export interface Automation {
  id: number;
  name: string;
  crontab: string;
  schedule_display: string;
  active: boolean;
  start_date: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_run_status: RunStatus | null;
  created_at: string;
  updated_at: string;
}

// `matching` annotates each automation with the time it fires on the queried day.
export interface MatchingAutomation extends Automation {
  matched_at: string;
}

export interface AutomationRun {
  id: number;
  automation: number;
  ran_at: string;
  status: RunStatus;
}

export interface Kpis {
  total_automations: number;
  active_schedules: number;
  success_rate: number;
}

// DRF's paginated envelope.
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MatchingResponse {
  date: string;
  count: number;
  results: MatchingAutomation[];
}

// Payload for creating an automation. The UI builds `crontab` from the
// Repetition + Start Date fields (see lib/cron.ts).
export interface CreateAutomationInput {
  name: string;
  crontab: string;
  start_date: string;
  active: boolean;
}
