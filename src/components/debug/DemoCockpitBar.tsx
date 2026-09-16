import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Database,
  MapPin,
  RefreshCw,
  Sparkles,
  Upload,
  Wrench,
} from "lucide-react";
import { useCallback, useState } from "react";
import { isDemoCockpitBarEnabled } from "@/config/demoCockpitFlags";
import { DEMO_COCKPIT_ROLES } from "@/services/demoCockpitService";
import type { CockpitDemoRole } from "@/types/cockpitDemo";
import { useCourseUp } from "@/context/useCourseUp";

const ROLE_LABEL: Record<CockpitDemoRole, string> = {
  "super-admin": "Super Admin",
  vip: "VIP",
  complimentary: "Complimentary",
  standard: "Standard",
};

export function DemoCockpitBar() {
  const {
    cockpitDemoProfile,
    switchDemoCockpitRole,
    triggerDemoGeofenceAlert,
    triggerDemoN2OSync,
    purgeLocalCourseUpData,
    triggerDemoDriveApiPush,
    triggerDemoHeritiaExport,
  } = useCourseUp();

  const [collapsed, setCollapsed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (label: string, action: () => Promise<void> | void) => {
    setBusy(true);
    setStatus(null);
    try {
      await action();
      setStatus(label);
    } catch {
      setStatus("Erreur recette démo");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!isDemoCockpitBarEnabled()) return null;

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 right-3 z-[90] flex justify-center sm:left-auto sm:right-4 sm:justify-end">
      <motion.div
        className="neria-card neria-demo-bar pointer-events-auto w-full max-w-md overflow-hidden"
        layout
      >
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
          onClick={() => setCollapsed((c) => !c)}
        >
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Wrench className="h-4 w-4 text-violet-600" />
            Recette Cockpit NeriaCorp
          </span>
          <span className="flex items-center gap-2">
            <span className="neria-badge neria-badge-tag text-[10px]">
              {cockpitDemoProfile.label}
            </span>
            {collapsed ? (
              <ChevronUp className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            )}
          </span>
        </button>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-200 px-3 pb-3 pt-2"
            >
              <p className="mb-2 text-[10px] text-slate-600">
                Simulation postMessage · rôles multi-tenant · données Selys démo
              </p>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {DEMO_COCKPIT_ROLES.map((role) => (
                  <button
                    key={role}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(`Profil ${ROLE_LABEL[role]}`, () => {
                        switchDemoCockpitRole(role);
                      })
                    }
                    className={`neria-badge neria-badge-tag transition ${
                      cockpitDemoProfile.role === role ? "ring-2 ring-violet-500" : ""
                    }`}
                  >
                    {ROLE_LABEL[role]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="neria-cta-primary col-span-2 flex items-center justify-center gap-1 px-2 py-2 text-[11px]"
                  onClick={() =>
                    run("Push API Drive simulé", async () => {
                      await triggerDemoDriveApiPush();
                    })
                  }
                >
                  <Upload className="h-3.5 w-3.5" />
                  Simuler push API Drive
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="neria-cta-n2o col-span-2 flex items-center justify-center gap-1 px-2 py-2 text-[11px]"
                  onClick={() =>
                    run("Export Heritia forcé", async () => {
                      await triggerDemoHeritiaExport();
                    })
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Forcer export Heritia
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="neria-cta-n2o flex items-center justify-center gap-1 px-2 py-2 text-[11px]"
                  onClick={() =>
                    run("Rôle VIP injecté", () => {
                      switchDemoCockpitRole("vip");
                    })
                  }
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Forcer VIP
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="neria-cta-primary flex items-center justify-center gap-1 px-2 py-2 text-[11px]"
                  onClick={() =>
                    run("Alerte géofencing < 2 km", async () => {
                      await triggerDemoGeofenceAlert();
                    })
                  }
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Géofence &lt; 2 km
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="neria-cta-primary flex items-center justify-center gap-1 px-2 py-2 text-[11px]"
                  onClick={() =>
                    run("Sync N2O simulée", async () => {
                      await triggerDemoN2OSync();
                    })
                  }
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Sync N2O
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="neria-cta-checkout flex items-center justify-center gap-1 px-2 py-2 text-[11px]"
                  onClick={() =>
                    run("IndexedDB purgée — rechargement…", async () => {
                      await purgeLocalCourseUpData();
                      window.location.reload();
                    })
                  }
                >
                  <Database className="h-3.5 w-3.5" />
                  Purger IndexedDB
                </button>
              </div>

              {status && (
                <p className="mt-2 text-center text-[10px] font-medium text-emerald-700">{status}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
