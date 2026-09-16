import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  RotateCcw,
  Truck,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { DispatchOrder, DispatchStatus } from "@/types/dispatch";
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
  const [order, setOrder] = useState<DispatchOrder>(() => createDispatchOrder(basket));

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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-emerald-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l&apos;optimiseur
      </button>

      <div className="rounded-2xl border border-border bg-card/50 p-4 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
            <Truck className="h-5 w-5 text-emerald-accent" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-accent/90">
              Hub de dispatch · {order.id}
            </p>
            <p className="text-sm text-slate-400">
              Export vers drives affiliés & bons Selys
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border bg-navy/40 px-2 py-3">
            <p className="text-[10px] uppercase text-slate-500">Total dépensé</p>
            <p className="text-base font-bold text-white">{order.totalSpent.toFixed(2)} €</p>
          </div>
          <div className="rounded-xl border border-border bg-navy/40 px-2 py-3">
            <p className="text-[10px] uppercase text-slate-500">Économies</p>
            <p className="text-base font-bold text-emerald-300">
              {order.totalSavings.toFixed(2)} €
            </p>
          </div>
          <div className="rounded-xl border border-border bg-navy/40 px-2 py-3">
            <p className="text-[10px] uppercase text-slate-500">N2O crédité</p>
            <p className="text-base font-bold text-emerald-300">+{order.totalN2OCredited}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/40 p-4 backdrop-blur-md">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : active
                      ? "border-border bg-navy/50"
                      : "border-border/60 bg-navy/20 opacity-70"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    done
                      ? "text-emerald-accent"
                      : step.status === "checkout_started"
                        ? "animate-spin text-amber-400"
                        : "text-slate-500"
                  }`}
                />
                <span className="text-sm text-slate-200">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Export drives affiliés</h3>
        {order.driveCheckouts.map((checkout, index) => (
          <DriveExportCard
            key={checkout.id}
            checkout={checkout}
            index={index}
            onStatusChange={updateDriveStatus}
          />
        ))}
        {order.driveCheckouts.length === 0 && (
          <p className="text-xs text-slate-500">Aucun drive — panier 100 % Selys.</p>
        )}
      </div>

      {order.selysVoucher && (
        <SelysVoucherCard voucher={order.selysVoucher} onStatusChange={updateSelysStatus} />
      )}

      {allDone && (
        <motion.p
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-300"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Parcours dispatch terminé — N2O crédité sur votre compte NeriaCorp.
        </motion.p>
      )}

      <motion.button
        type="button"
        onClick={onNewOrder}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-navy/40 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
        whileTap={{ scale: 0.98 }}
      >
        <RotateCcw className="h-4 w-4" />
        Nouvelle commande
      </motion.button>
    </motion.div>
  );
}
