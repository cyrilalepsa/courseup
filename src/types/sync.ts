export type SyncJobKind = "heritia_fresh_export" | "badge_snapshot";

export interface SyncJob {
  id: string;
  kind: SyncJobKind;
  createdAt: string;
  payload: unknown;
  attempts: number;
}
