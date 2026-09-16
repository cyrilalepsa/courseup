import { AnimatePresence, motion } from "framer-motion";
import { Bell, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useCourseUp } from "@/context/CourseUpContext";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendDemoNotification,
} from "@/services/notificationService";
import { getActiveBridges, subscribeBridgeRegistry } from "@/services/bridgeRegistryService";

interface NotificationSettingsProps {
  open: boolean;
  onClose: () => void;
  variant?: "modal" | "inline";
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white/90 px-3 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-0.5 text-[11px] text-slate-600">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        data-on={checked ? "true" : "false"}
        onClick={() => onChange(!checked)}
        className="neria-toggle mt-0.5"
      >
        <span className="neria-toggle-knob" />
      </button>
    </div>
  );
}

export function NotificationSettings({
  open,
  onClose,
  variant = "modal",
}: NotificationSettingsProps) {
  const {
    notificationPrefs,
    setNotificationPref,
    notificationPermission,
    refreshNotificationPermission,
  } = useCourseUp();

  const [cockpitBridgeCount, setCockpitBridgeCount] = useState(
    () => getActiveBridges().filter((b) => b.source === "cockpit").length,
  );

  useEffect(
    () =>
      subscribeBridgeRegistry((bridges) => {
        setCockpitBridgeCount(bridges.filter((b) => b.source === "cockpit").length);
      }),
    [],
  );

  const requestAccess = useCallback(async () => {
    await requestNotificationPermission();
    refreshNotificationPermission();
  }, [refreshNotificationPermission]);

  const sendDemo = useCallback(async () => {
    if (getNotificationPermission() !== "granted") {
      await requestAccess();
    }
    await sendDemoNotification();
  }, [requestAccess]);

  const panel = (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#22D3EE_0%,#0041E6_100%)]">
          <Bell className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
            Notifications PWA
          </p>
          <p className="text-sm text-slate-600">
            Proximité &lt; 2 km · paliers N2O · rappels drive
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Permission :{" "}
            <span className="font-semibold text-slate-800">{notificationPermission}</span>
            {cockpitBridgeCount > 0 && (
              <>
                {" "}
                · {cockpitBridgeCount} pont Cockpit actif{cockpitBridgeCount > 1 ? "s" : ""}
              </>
            )}
          </p>
        </div>
      </div>

      {notificationPermission !== "granted" && (
        <button
          type="button"
          onClick={() => void requestAccess()}
          className="neria-cta-primary w-full px-4 py-2.5 text-sm"
        >
          Autoriser les notifications
        </button>
      )}

      <ToggleRow
        label="Alertes de proximité"
        description="Selys partenaires & drive habituel à moins de 2 km"
        checked={notificationPrefs.proximityAlerts}
        onChange={(v) => setNotificationPref("proximityAlerts", v)}
      />
      <ToggleRow
        label="Cashback N2O · paliers"
        description="Notification lors d'un nouveau palier de solde"
        checked={notificationPrefs.n2oTierAlerts}
        onChange={(v) => setNotificationPref("n2oTierAlerts", v)}
      />
      <ToggleRow
        label="Rappels drive"
        description="Confirmation de commande à récupérer"
        checked={notificationPrefs.driveReminders}
        onChange={(v) => setNotificationPref("driveReminders", v)}
      />

      <motion.button
        type="button"
        onClick={() => void sendDemo()}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-blue-900"
        whileTap={{ scale: 0.98 }}
      >
        <Sparkles className="h-4 w-4 text-violet-600" />
        Envoyer une notification de démonstration
      </motion.button>
    </div>
  );

  if (variant === "inline") {
    return <div className="neria-card p-4">{panel}</div>;
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={onClose}
          />
          <motion.div
            className="neria-card relative z-10 w-full max-w-md p-4 sm:p-5"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Paramètres notifications</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {panel}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
