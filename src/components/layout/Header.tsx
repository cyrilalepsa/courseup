import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CloudOff,
  Download,
  MapPin,
  ShoppingBag,
  Store,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { StoreSelector } from "@/components/store/StoreSelector";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { useCourseUp } from "@/context/CourseUpContext";

type ConnectionStatus = "online" | "offline";

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator &&
      (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

interface HeaderProps {
  shoppingReady?: boolean;
  onStartInStore?: () => void;
}

export function Header(props: HeaderProps = {}) {
  const { shoppingReady, onStartInStore } = props;
  const {
    n2oBalance,
    locationPrefs,
    storeSelectorOpen,
    setStoreSelectorOpen,
    notificationSettingsOpen,
    setNotificationSettingsOpen,
  } = useCourseUp();
  const [connection, setConnection] = useState<ConnectionStatus>(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
  );
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone] = useState(detectStandalone);

  useEffect(() => {
    const onOnline = () => setConnection("online");
    const onOffline = () => setConnection("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const onBeforeInstall = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }, [installPrompt]);

  const isOnline = connection === "online";
  const pwaLabel = isStandalone ? "PWA" : "Web";
  const StatusIcon = isOnline ? Wifi : WifiOff;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/15 bg-[#0B1120]/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 safe-area-inset-top">
          <motion.div
            className="flex min-w-0 items-center gap-2.5"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#22D3EE_0%,#0041E6_100%)] shadow-lg shadow-black/20">
              <ShoppingBag className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h1 className="text-lg font-semibold tracking-tight text-white">
                  CourseUp
                </h1>
                <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-200">
                  by NeriaCorp
                </span>
              </div>
              <p className="truncate text-xs text-slate-300">Ingestion intelligente</p>
            </div>
          </motion.div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              {shoppingReady && onStartInStore && (
                <motion.button
                  type="button"
                  onClick={onStartInStore}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-400/15 px-2 py-1.5 text-[10px] font-semibold text-emerald-100 sm:text-[11px]"
                  whileTap={{ scale: 0.96 }}
                >
                  <Store className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Démarrer mes courses</span>
                </motion.button>
              )}
              <button
                type="button"
                onClick={() => setNotificationSettingsOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-medium text-slate-100 backdrop-blur-md transition hover:bg-white/20"
                aria-label="Notifications"
              >
                <Bell className="h-3.5 w-3.5 text-cyan-300" />
                <span className="hidden sm:inline">Notifs</span>
              </button>
              <button
                type="button"
                onClick={() => setStoreSelectorOpen(true)}
                className="hidden items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-medium text-slate-100 backdrop-blur-md transition hover:bg-white/20 sm:inline-flex"
              >
                <MapPin className="h-3 w-3 text-cyan-300" />
                {locationPrefs.postalCode} · {locationPrefs.searchRadiusKm} km
              </button>
              <motion.span
                className={`inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium text-slate-100 backdrop-blur-md ${
                  isOnline ? "text-cyan-200" : "text-amber-200"
                }`}
                layout
              >
                <StatusIcon className="h-3.5 w-3.5" />
                <span>{pwaLabel}</span>
                <span className="text-slate-400">·</span>
                <span>{isOnline ? "En ligne" : "Hors ligne"}</span>
              </motion.span>

              {installPrompt && !isStandalone && (
                <motion.button
                  type="button"
                  onClick={handleInstall}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-400/15 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-400/25"
                  whileTap={{ scale: 0.96 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Installer
                </motion.button>
              )}
            </div>

            <motion.div className="neria-badge-n2o" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!isOnline && <CloudOff className="h-3 w-3 text-violet-600" />}
              <span>{n2oBalance.toLocaleString("fr-FR")} N2O</span>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500" />
            </motion.div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {!isOnline && (
          <motion.div
            className="relative z-40 border-b border-amber-400/30 bg-amber-400/15 px-4 py-2 text-center backdrop-blur-md"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs font-medium text-amber-100">
              Mode Hors-ligne — Données sauvegardées en local
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <StoreSelector
        variant="modal"
        open={storeSelectorOpen}
        onClose={() => setStoreSelectorOpen(false)}
      />

      <NotificationSettings
        open={notificationSettingsOpen}
        onClose={() => setNotificationSettingsOpen(false)}
      />
    </>
  );
}
