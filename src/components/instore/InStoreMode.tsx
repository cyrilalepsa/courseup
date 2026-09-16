import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  Clock3,
  ScanLine,
  ShoppingBasket,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ItemBadgeRow } from "@/components/item/ItemBadgeRow";
import {
  getAisleOrderForStore,
  defaultAisleOrder,
  groupItemsByAisle,
  moveAisleInOrder,
  persistAisleOrderForStore,
  resolveInStoreShoppingStoreId,
} from "@/services/aisleService";
import { ensureItemAttributesList } from "@/services/itemAttributeService";
import { loadInStoreSession, saveInStoreSession } from "@/services/storageService";
import { estimateUnitPrice } from "@/features/optimizer/optimizeCart";
import type { MacroAisleId } from "@/types/aisle";
import type { IngestedItem } from "@/types/ingestion";
import type { OptimizedBasket } from "@/types/optimizer";

interface InStoreModeProps {
  items: IngestedItem[];
  basket: OptimizedBasket;
  onClose: () => void;
  onOpenCheckoutPass?: () => void;
}

function lineTotal(item: IngestedItem): number {
  return Number((estimateUnitPrice(item) * item.quantity).toFixed(2));
}

export function InStoreMode({ items, basket, onClose, onOpenCheckoutPass }: InStoreModeProps) {
  const storeId = resolveInStoreShoppingStoreId(basket);
  const enrichedItems = useMemo(() => ensureItemAttributesList(items), [items]);

  const [aisleOrder, setAisleOrder] = useState<MacroAisleId[]>(() => defaultAisleOrder());
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [deferredIds, setDeferredIds] = useState<Set<string>>(() => new Set());
  const [reorderMode, setReorderMode] = useState(false);
  const [dragAisleId, setDragAisleId] = useState<MacroAisleId | null>(null);

  useEffect(() => {
    void getAisleOrderForStore(storeId).then(setAisleOrder);
    void loadInStoreSession().then((session) => {
      if (!session || session.storeId !== storeId) return;
      setCheckedIds(new Set(session.checkedIds));
      setDeferredIds(new Set(session.deferredIds));
    });
  }, [storeId]);

  const activeItems = useMemo(
    () => enrichedItems.filter((item) => !deferredIds.has(item.id)),
    [enrichedItems, deferredIds],
  );

  const deferredItems = useMemo(
    () => enrichedItems.filter((item) => deferredIds.has(item.id)),
    [enrichedItems, deferredIds],
  );

  const groups = useMemo(
    () => groupItemsByAisle(activeItems, storeId, aisleOrder),
    [activeItems, storeId, aisleOrder],
  );

  const persistSession = useCallback(
    (nextChecked: Set<string>, nextDeferred: Set<string>) => {
      void saveInStoreSession({
        storeId,
        checkedIds: [...nextChecked],
        deferredIds: [...nextDeferred],
        updatedAt: new Date().toISOString(),
      });
    },
    [storeId],
  );

  const toggleChecked = useCallback(
    (id: string) => {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persistSession(next, deferredIds);
        return next;
      });
    },
    [deferredIds, persistSession],
  );

  const deferItem = useCallback(
    (id: string) => {
      setDeferredIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        persistSession(checkedIds, next);
        return next;
      });
      setCheckedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [checkedIds, persistSession],
  );

  const restoreDeferred = useCallback(
    (id: string) => {
      setDeferredIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        persistSession(checkedIds, next);
        return next;
      });
    },
    [checkedIds, persistSession],
  );

  const shiftAisle = useCallback(
    (aisleId: MacroAisleId, direction: "up" | "down") => {
      setAisleOrder((prev) => {
        const next = moveAisleInOrder(prev, aisleId, direction);
        void persistAisleOrderForStore(storeId, next);
        return next;
      });
    },
    [storeId],
  );

  const dropAisle = useCallback(
    (targetAisleId: MacroAisleId) => {
      if (!dragAisleId || dragAisleId === targetAisleId) return;
      setAisleOrder((prev) => {
        const next = [...prev];
        const fromIndex = next.indexOf(dragAisleId);
        const toIndex = next.indexOf(targetAisleId);
        if (fromIndex < 0 || toIndex < 0) return prev;
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, dragAisleId);
        void persistAisleOrderForStore(storeId, next);
        return next;
      });
      setDragAisleId(null);
    },
    [dragAisleId, storeId],
  );

  const forecastTotal = basket.savings.optimizedTotal;
  const actualTotal = useMemo(() => {
    return enrichedItems.reduce((sum, item) => {
      if (!checkedIds.has(item.id)) return sum;
      return sum + lineTotal(item);
    }, 0);
  }, [checkedIds, enrichedItems]);

  const checkedCount = checkedIds.size;
  const totalCount = enrichedItems.length;
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;
  const budgetRatio = forecastTotal > 0 ? Math.min(1.2, actualTotal / forecastTotal) : 0;

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col bg-[#0B1120] text-slate-100"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
    >
      <header className="border-b border-white/10 bg-[#0B1120]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 p-2.5"
            aria-label="Quitter le mode magasin"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
              Mode In-Store
            </p>
            <p className="truncate text-sm font-semibold">
              Parcours {storeId.toUpperCase()} · macro-rayons
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onOpenCheckoutPass && (
              <button
                type="button"
                onClick={onOpenCheckoutPass}
                className="neria-cta-checkout text-[10px]"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Pass
              </button>
            )}
            <ShoppingBasket className="h-6 w-6 text-cyan-300" />
          </div>
        </div>

        <div className="mx-auto mt-3 max-w-lg space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>
              {checkedCount}/{totalCount} articles cochés
            </span>
            <span className="font-semibold text-cyan-200">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600"
              animate={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="neria-card px-3 py-2">
            <div className="mb-1 flex items-center justify-between text-[11px] text-slate-600">
              <span>Caddie réel (articles cochés)</span>
              <span>Prévisionnel {forecastTotal.toFixed(2)} €</span>
            </div>
            <div className="flex items-end justify-between gap-2">
              <p className="text-lg font-bold text-slate-900">{actualTotal.toFixed(2)} €</p>
              <p
                className={`text-xs font-semibold ${
                  actualTotal <= forecastTotal ? "text-emerald-700" : "text-orange-700"
                }`}
              >
                {actualTotal <= forecastTotal ? "Dans le budget" : "Au-dessus du budget"}
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${
                  actualTotal <= forecastTotal ? "bg-emerald-500" : "bg-orange-500"
                }`}
                style={{ width: `${Math.min(100, budgetRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-slate-300">Liste par macro-rayons</p>
          <button
            type="button"
            onClick={() => setReorderMode((v) => !v)}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
              reorderMode
                ? "bg-cyan-400/20 text-cyan-200"
                : "border border-white/15 text-slate-200"
            }`}
          >
            {reorderMode ? "Fin réorganisation" : "Glisser-déposer rayons"}
          </button>
        </div>

        <div className="space-y-4">
          {groups.map((group) => (
            <section
              key={group.aisleId}
              className={`neria-card overflow-hidden ${dragAisleId === group.aisleId ? "ring-2 ring-cyan-400" : ""}`}
              draggable={reorderMode}
              onDragStart={() => reorderMode && setDragAisleId(group.aisleId)}
              onDragOver={(e) => reorderMode && e.preventDefault()}
              onDrop={() => reorderMode && dropAisle(group.aisleId)}
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {reorderMode && <span className="mr-2 cursor-grab text-slate-400">⠿</span>}
                  {group.label}
                </h3>
                {reorderMode && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => shiftAisle(group.aisleId, "up")}
                      className="rounded-lg border border-slate-300 p-1.5"
                      aria-label="Monter le rayon"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => shiftAisle(group.aisleId, "down")}
                      className="rounded-lg border border-slate-300 p-1.5"
                      aria-label="Descendre le rayon"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <ul className="divide-y divide-slate-200">
                {group.items.map((item) => {
                  const checked = checkedIds.has(item.id);
                  return (
                    <li key={item.id}>
                      <div
                        className={`flex items-stretch gap-2 px-2 py-2 ${
                          checked ? "neria-instore-checked" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleChecked(item.id)}
                          className={`flex min-h-[56px] flex-1 items-center gap-3 rounded-xl border px-3 text-left transition ${
                            checked
                              ? "border-emerald-400/50 bg-emerald-50/90"
                              : "border-slate-200 bg-white hover:border-blue-400"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 ${
                              checked
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            <Check className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900">
                              {item.name}
                            </span>
                            <ItemBadgeRow
                              attributes={item.attributes}
                              qualityScore={item.qualityScore}
                              className="mt-1"
                            />
                            <span className="mt-1 block text-xs text-slate-600">
                              × {item.quantity} {item.unit} · ~{lineTotal(item).toFixed(2)} €
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => deferItem(item.id)}
                          className="flex w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-amber-300/60 bg-amber-50 px-1 py-2 text-[10px] font-semibold leading-tight text-amber-900"
                        >
                          <Clock3 className="h-4 w-4" />
                          Pas en rayon
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        {deferredItems.length > 0 && (
          <section className="mt-6 neria-card border border-amber-300/40 p-3">
            <h3 className="text-sm font-bold text-slate-900">En attente / reporter</h3>
            <p className="mb-2 text-[11px] text-slate-600">
              Articles glissés hors parcours — à retrouver plus tard
            </p>
            <ul className="space-y-2">
              {deferredItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <ItemBadgeRow
                      attributes={item.attributes}
                      qualityScore={item.qualityScore}
                    />
                    <span className="mt-1 block truncate text-sm text-slate-800">{item.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreDeferred(item.id)}
                    className="shrink-0 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white"
                  >
                    Remettre
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </motion.div>
  );
}
