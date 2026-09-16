import type { NotificationPreferences } from "@/types/notifications";

export type BridgeDirection = "import" | "export" | "bidirectional";

export type BridgeSource = "builtin" | "cockpit";

export interface NeriaBridgeDefinition {
  id: string;
  appName: string;
  title: string;
  subtitle: string;
  detail: string;
  exportTitle: string;
  exportDetail: string;
  accentClass: string;
  directions: BridgeDirection[];
  importEndpoint: string;
  exportEndpoint: string;
  enabled: boolean;
  source: BridgeSource;
  version: string;
}

export interface CockpitBridgeManifest {
  schema: "neriacorp.cockpit.bridges";
  version: number;
  issuedAt: string;
  bridges: Array<Partial<NeriaBridgeDefinition> & Pick<NeriaBridgeDefinition, "id">>;
  notificationDefaults?: Partial<NotificationPreferences>;
}

export type BridgeRegistryListener = (bridges: NeriaBridgeDefinition[]) => void;
