export function getDriveApiMode(): "mock" | "live" {
  return import.meta.env.VITE_DRIVE_API_MODE === "live" ? "live" : "mock";
}

export interface DriveConnectorConfig {
  id: string;
  label: string;
  baseUrl: string;
  enabled: boolean;
}

function envConnector(id: string, label: string, envKey: string): DriveConnectorConfig {
  const baseUrl = import.meta.env[envKey as keyof ImportMetaEnv] as string | undefined;
  return {
    id,
    label,
    baseUrl: baseUrl?.trim() || "mock",
    enabled: true,
  };
}

export const DRIVE_CONNECTOR_CONFIGS: DriveConnectorConfig[] = [
  envConnector("carrefour", "Carrefour Drive", "VITE_DRIVE_API_CARREFOUR"),
  envConnector("leclerc", "Leclerc Drive", "VITE_DRIVE_API_LECLERC"),
  envConnector("auchan", "Auchan Drive", "VITE_DRIVE_API_AUCHAN"),
];

export function getEnabledDriveConnectors(): DriveConnectorConfig[] {
  return DRIVE_CONNECTOR_CONFIGS.filter((c) => c.enabled);
}

export function getHeritiaExportEndpoint(): string {
  const fromEnv = import.meta.env.VITE_HERITIA_EXPORT_ENDPOINT;
  return (
    (typeof fromEnv === "string" && fromEnv.trim()) ||
    "https://app.neriacorp.io/heritia/import"
  );
}
