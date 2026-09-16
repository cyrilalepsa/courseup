import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  RotateCcw,
  Share2,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExportModal } from "@/components/export/ExportModal";
import type { DispatchOrder, DispatchStatus } from "@/types/dispatch";
import { useCourseUp } from "@/context/CourseUpContext";
import { createExportBundle } from "@/services/exportService";
import {
  computeGlobalStatus,
  createDispatchOrder,
  stepsFromOrder,
} from "./buildDispatchOrder";
import { DriveExportCard } from "./DriveExportCard";
import { SelysVoucherCard } from "./SelysVoucherCard";
import type { OptimizedBasket } from "@/types/optimizer";

interface DispatchHubProps {
  basket: OptimizedBasket;
  onBack: () => void;
  onNewOrder: () => void;
}

export function DispatchHub({ basket, onBack, onNewOrder }: DispatchHubProps) {
  const { addN2OBalance, saveOrder, items } = useCourseUp();
  const [order, setOrder] = useState<DispatchOrder>(() => createDispatchOrder(basket));
  const [exportOpen, setExportOpen] = useState(false);
  const [exportSession, setExportSession] = useState(0);
  const orderPersistedRef = useRef(false);

  const exportBundle = useMemo(
    () => createExportBundle("dispatch", items, basket, order),
    [items, basket, order],
  );

  const steps = useMemo(() => stepsFromOrder(order), [order]);

  const updateDriveStatus = useCallback((id: string, status: DispatchStatus) => {
    setOrder((prev) => {
      const driveCheckouts = prev.driveCheckouts.map((d) =>
        d.id === id ? { ...d, status } : d,
      );
      return {
        ...prev,
        driveCheckouts,
        globalStatus: computeGlobalStatus(driveCheckouts, prev.selysVoucher),
      };
    });
  }, []);

  const updateSelysStatus = useCallback((id: string, status: DispatchStatus) => {
    setOrder((prev) => {
      if (!prev.selysVoucher || prev.selysVoucher.id !== id) return prev;
      const selysVoucher = { ...prev.selysVoucher, status };
      return {
        ...prev,
        selysVoucher,
        globalStatus: computeGlobalStatus(prev.driveCheckouts, selysVoucher),
      };
    });
  }, []);

  const allDone = order.globalStatus === "completed";

  useEffect(() => {
    if (!allDone || orderPersistedRef.current) return;
    const creditKey = `courseup:n2o-credited:${order.id}`;
    if (sessionStorage.getItem(creditKey)) {
      orderPersistedRef.current = true;
      return;
    }
    orderPersistedRef.current = true;
    sessionStorage.setItem(creditKey, "1");
    const finalized: DispatchOrder = { ...order, globalStatus: "completed" };
    void saveOrder(finalized);
    addN2OBalance(order.totalN2OCredited);
  }, [addN2OBalance, allDone, order, saveOrder]);

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
    >
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 transition hover:text-cyan-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;optimiseur
      </button>

      <div className="neria-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <Truck className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              Hub de dispatch · {order.id}
            </p>
            <p className="text-sm text-slate-600">
              Export vers drives affiliés & bons Selys
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setExportSession((n) => n + 1);
              setExportOpen(true);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-400"
          >
            <Share2 className="h-3.5 w-3.5" />
            Export
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 bg-white px-2 py-3">
            <p className="text-[10px] uppercase text-slate-600">Total dépensé</p>
            <p className="text-base font-bold text-slate-900">{order.totalSpent.toFixed(2)} €</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-2 py-3">
            <p className="text-[10px] uppercase text-slate-600">Économies</p>
            <p className="text-base font-bold text-blue-700">
              {order.totalSavings.toFixed(2)} €
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-2 py-3">
            <p className="text-[10px] uppercase text-slate-600">N2O crédité</p>
            <p className="text-base font-bold text-violet-700">+{order.totalN2OCredited}</p>
          </div>
        </div>
      </div>

      <div className="neria-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Progression validation
        </p>
        <ol className="space-y-2">
          {steps.map((step, index) => {
            const done = step.status === "completed";
            const active =
              step.status === "exported" ||
              step.status === "checkout_started" ||
              (step.status === "pending" &&
                steps.slice(0, index).every((s) => s.status === "completed"));
            const Icon =
              step.status === "checkout_started" && !done
                ? Loader2
                : done
                  ? CheckCircle2
                  : Circle;
            return (
              <li
                key={step.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  done
                    ? "border-blue-300 bg-blue-50"
                    : active
                      ? "border-slate-300 bg-white"
                      : "border-slate-200 bg-slate-50 opacity-70"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    done
                      ? "text-blue-600"
                      : step.status === "checkout_started"
                        ? "animate-spin text-amber-500"
                        : "text-slate-500"
                  }`}
                />
                <span className="text-sm text-slate-800">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-100">Export drives affiliés</h3>
        {order.driveCheckouts.map((checkout, index) => (
          <DriveExportCard
            key={checkout.id}
            checkout={checkout}
            index={index}
            onStatusChange={updateDriveStatus}
          />
        ))}
        {order.driveCheckouts.length === 0 && (
          <p className="text-xs text-slate-300">Aucun drive — panier 100 % Selys.</p>
        )}
      </div>

      {order.selysVoucher && (
        <SelysVoucherCard voucher={order.selysVoucher} onStatusChange={updateSelysStatus} />
      )}

      {allDone && (
        <motion.p
          className="neria-card border border-blue-200 px-4 py-3 text-center text-sm font-medium text-blue-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Parcours dispatch terminé — +{order.totalN2OCredited} N2O crédités sur votre solde
          local.
        </motion.p>
      )}

      <motion.button
        type="button"
        onClick={onNewOrder}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400"
        whileTap={{ scale: 0.98 }}
      >
        <RotateCcw className="h-4 w-4" />
        Nouvelle commande
      </motion.button>

      <ExportModal
        key={exportSession}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        bundle={exportBundle}
      />
    </motion.div>
  );
}
