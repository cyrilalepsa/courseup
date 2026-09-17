/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_COCKPIT?: string;
  readonly VITE_DRIVE_API_MODE?: string;
  readonly VITE_DRIVE_API_CARREFOUR?: string;
  readonly VITE_DRIVE_API_LECLERC?: string;
  readonly VITE_DRIVE_API_AUCHAN?: string;
  readonly VITE_HERITIA_EXPORT_ENDPOINT?: string;
  readonly VITE_AFF_WEBHOOK_URL?: string;
  readonly VITE_AFF_PARTNER_CARREFOUR?: string;
  readonly VITE_AFF_SUB_CARREFOUR?: string;
  readonly VITE_AFF_CPA_CARREFOUR?: string;
  readonly VITE_AFF_CPL_CARREFOUR?: string;
  readonly VITE_AFF_PARTNER_LECLERC?: string;
  readonly VITE_AFF_SUB_LECLERC?: string;
  readonly VITE_AFF_CPA_LECLERC?: string;
  readonly VITE_AFF_PARTNER_AUCHAN?: string;
  readonly VITE_AFF_SUB_AUCHAN?: string;
  readonly VITE_AFF_CPA_AUCHAN?: string;
  readonly VITE_AFF_PARTNER_LIDL?: string;
  readonly VITE_AFF_SUB_LIDL?: string;
  readonly VITE_AFF_CPA_LIDL?: string;
  readonly VITE_AFF_PARTNER_ALDI?: string;
  readonly VITE_AFF_SUB_ALDI?: string;
  readonly VITE_AFF_CPA_ALDI?: string;
  readonly VITE_AFF_PARTNER_ARWIN?: string;
  readonly VITE_AFF_SUB_ARWIN?: string;
  readonly VITE_AFF_CPA_ARWIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent;
}
