import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  appendOrder,
  DEFAULT_N2O_BALANCE,
  loadPersistedState,
  saveCart,
  saveN2OBalance,
} from "@/services/storageService";
import type { DispatchOrder } from "@/types/dispatch";
import type { IngestedItem } from "@/types/ingestion";
import { createIngestedItem } from "@/features/ingestion/mockIngestion";

interface CourseUpContextValue {
  isHydrated: boolean;
  items: IngestedItem[];
  n2oBalance: number;
  ordersHistory: DispatchOrder[];
  setItems: (items: IngestedItem[]) => void;
  addItem: (item?: Partial<IngestedItem> & Pick<IngestedItem, "name">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  addN2OBalance: (amount: number) => void;
  saveOrder: (order: DispatchOrder) => Promise<void>;
}

const CourseUpContext = createContext<CourseUpContextValue | null>(null);

export function CourseUpProvider({ children }: { children: ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [items, setItemsState] = useState<IngestedItem[]>([]);
  const [n2oBalance, setN2oBalance] = useState(DEFAULT_N2O_BALANCE);
  const [ordersHistory, setOrdersHistory] = useState<DispatchOrder[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadPersistedState().then((state) => {
      if (cancelled) return;
      setItemsState(state.cart);
      setN2oBalance(state.n2oBalance);
      setOrdersHistory(state.ordersHistory);
      setIsHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setItems = useCallback((next: IngestedItem[]) => {
    setItemsState(next);
    void saveCart(next);
  }, []);

  const addItem = useCallback(
    (partial?: Partial<IngestedItem> & Pick<IngestedItem, "name">) => {
      setItemsState((prev) => {
        const next = [
          ...prev,
          createIngestedItem(
            partial ?? {
              name: "Nouvel article",
              quantity: 1,
              unit: "u",
              category: "épicerie",
              confidenceScore: 1,
            },
            "text",
          ),
        ];
        void saveCart(next);
        return next;
      });
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItemsState((prev) => {
      const next = prev.filter((item) => item.id !== id);
      void saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItemsState([]);
    void saveCart([]);
  }, []);

  const addN2OBalance = useCallback((amount: number) => {
    if (amount <= 0) return;
    setN2oBalance((prev) => {
      const next = prev + amount;
      void saveN2OBalance(next);
      return next;
    });
  }, []);

  const saveOrder = useCallback(async (order: DispatchOrder) => {
    setOrdersHistory((prev) => {
      if (prev.some((o) => o.id === order.id)) return prev;
      return [order, ...prev].slice(0, 50);
    });
    await appendOrder(order);
  }, []);

  const value = useMemo(
    () => ({
      isHydrated,
      items,
      n2oBalance,
      ordersHistory,
      setItems,
      addItem,
      removeItem,
      clearCart,
      addN2OBalance,
      saveOrder,
    }),
    [
      isHydrated,
      items,
      n2oBalance,
      ordersHistory,
      setItems,
      addItem,
      removeItem,
      clearCart,
      addN2OBalance,
      saveOrder,
    ],
  );

  if (!isHydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-navy text-sm text-slate-400">
        Chargement des données locales…
      </div>
    );
  }

  return <CourseUpContext.Provider value={value}>{children}</CourseUpContext.Provider>;
}

export function useCourseUp(): CourseUpContextValue {
  const ctx = useContext(CourseUpContext);
  if (!ctx) {
    throw new Error("useCourseUp must be used within CourseUpProvider");
  }
  return ctx;
}
