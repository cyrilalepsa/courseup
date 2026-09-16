/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_COCKPIT?: string;
  readonly VITE_DRIVE_API_MODE?: string;
  readonly VITE_DRIVE_API_CARREFOUR?: string;
  readonly VITE_DRIVE_API_LECLERC?: string;
  readonly VITE_DRIVE_API_AUCHAN?: string;
  readonly VITE_HERITIA_EXPORT_ENDPOINT?: string;
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
