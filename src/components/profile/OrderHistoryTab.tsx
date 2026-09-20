import { motion } from "framer-motion";
import { History, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchN2OrderHistory, isN2IngressConfigured } from "@/services/api/n2IngressClient";
import type { N2OrderHistoryEntry } from "@shared/n2IngressApi";
import {
  buildOrderHistoryRows,
  type OrderHistoryRow,
} from "@/components/profile/orderHistoryUtils";
import type { DispatchOrder } from "@/types/dispatch";
import {
  loadInStoreSession,
  type InStoreSessionState,
} from "@/services/storageService";

interface OrderHistoryTabProps {
  orders: DispatchOrder[];
  onReloadOrder: (order: DispatchOrder) => Promise<void>;
}

function heritiaLabel(status: OrderHistoryRow["heritiaSync"]): string {
  if (status === "synced") return "Heritia synchronisé";
  if (status === "pending") return "Sync Heritia en attente";
  return "Heritia N/A";
}

export function OrderHistoryTab({ orders, onReloadOrder }: OrderHistoryTabProps) {
  const [instore, setInstore] = useState<InStoreSessionState | null>(null);
  const [remoteRows, setRemoteRows] = useState<N2OrderHistoryEntry[]>([]);

  useEffect(() => {
    void loadInStoreSession().then(setInstore);
  }, [orders.length]);

  useEffect(() => {
    if (!isN2IngressConfigured()) return;
    void fetchN2OrderHistory().then((payload) => {
      if (payload?.entries?.length) setRemoteRows(payload.entries);
    });
  }, [orders.length]);

  const rows = useMemo(() => {
    const base =
      remoteRows.length > 0
        ? remoteRows.map((row) => ({ ...row }))
        : buildOrderHistoryRows(orders);
    if (instore && instore.checkedIds.length > 0) {
      base.unshift({
        id: "instore-active",
        orderId: "instore-session",
        kind: "instore",
        label: "Pass Caisse In-Store",
        storeName: instore.storeId,
        date: instore.updatedAt,
        totalEuro: instore.checkedIds.length * 4.5,
        n2oCredited: instore.checkedIds.length * 12,
        heritiaSync: "pending",
        status: "checkout_started",
      });
    }
    return base;
  }, [orders, instore, remoteRows]);

  const orderById = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/40 p-6 text-center backdrop-blur-sm">
        <History className="mx-auto mb-2 h-8 w-8 text-slate-400" />
        <p className="text-sm font-medium text-slate-700">Aucune commande enregistrée</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Vos achats Drive, Pass Caisse et réservations Selys apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
        Mes Commandes &amp; Reçus
      </p>
      <ul className="space-y-2">
        {rows.map((row) => {
          const order = orderById.get(row.orderId);
          return (
            <motion.li
              key={row.id}
              layout
              className="rounded-2xl border border-white/40 bg-white/55 p-3 backdrop-blur-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{row.label}</p>
                  <p className="truncate text-[11px] text-slate-600">{row.storeName}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {new Date(row.date).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">
                    {row.totalEuro.toFixed(2)} €
                  </p>
                  <p className="text-[10px] font-semibold text-violet-700">
                    +{row.n2oCredited} N2O
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="neria-badge neria-badge-tag text-[9px]">{row.status}</span>
                <span className="neria-badge neria-badge-tag text-[9px]">
                  {heritiaLabel(row.heritiaSync)}
                </span>
              </div>
              {order && (
                <button
                  type="button"
                  onClick={() => void onReloadOrder(order)}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50/80 py-1.5 text-[10px] font-semibold text-blue-900"
                >
                  <RefreshCw className="h-3 w-3" />
                  Recharger ce panier dans ma liste
                </button>
              )}
              {row.id === "instore-active" && !order && (
                <p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700">
                  <Sparkles className="h-3 w-3" />
                  Session magasin en cours
                </p>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
