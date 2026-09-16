import { motion } from "framer-motion";
import {
  CloudOff,
  Download,
  ShoppingBag,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ConnectionStatus = "online" | "offline";

export function Header() {
  const [connection, setConnection] = useState<ConnectionStatus>(
    typeof navigator !== "undefined" && navigator.onLine ? "online" : "offline",
  );
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const onOnline = () => setConnection("online");
    const onOffline = () => setConnection("offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIsStandalone(standalone);

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
  const statusColor = isOnline ? "text-emerald-400" : "text-amber-400";
  const StatusIcon = isOnline ? Wifi : WifiOff;

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-navy/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 safe-area-inset-top">
        <motion.div
          className="flex min-w-0 items-center gap-2.5"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_24px_-8px_rgba(16,185,129,0.55)]">
            <ShoppingBag className="h-5 w-5 text-emerald-accent" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <h1 className="text-lg font-semibold tracking-tight text-white">
                CourseUp
              </h1>
              <span className="rounded-full border border-border bg-card/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                by NeriaCorp
              </span>
            </div>
            <p className="truncate text-xs text-slate-500">Ingestion intelligente</p>
          </div>
        </motion.div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <motion.span
              className={`inline-flex items-center gap-1 rounded-full border border-border bg-card/70 px-2 py-1 text-[11px] font-medium backdrop-blur-md ${statusColor}`}
              layout
            >
              <StatusIcon className="h-3.5 w-3.5" />
              <span>{pwaLabel}</span>
              <span className="text-slate-500">·</span>
              <span>{isOnline ? "En ligne" : "Hors ligne"}</span>
            </motion.span>

            {installPrompt && !isStandalone && (
              <motion.button
                type="button"
                onClick={handleInstall}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/25"
                whileTap={{ scale: 0.96 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Download className="h-3.5 w-3.5" />
                Installer
              </motion.button>
            )}
          </div>

          <motion.div
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-300/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {!isOnline && <CloudOff className="h-3 w-3 text-amber-400/90" />}
            <span>Prêt pour le Panier N2O</span>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-accent" />
          </motion.div>
        </div>
      </div>
    </header>
  );
}
