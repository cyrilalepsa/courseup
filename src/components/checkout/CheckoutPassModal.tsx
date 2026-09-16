import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ScanLine, Sun, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  acquireScreenWakeLock,
  releaseScreenWakeLock,
} from "@/services/wakeLockService";
import { buildUniversalCheckoutQrPayload } from "@/services/selysDispatchService";
import type { CheckoutWalletState } from "@/types/checkout";
import type { ExportBundle } from "@/types/export";
import type { OptimizedBasket } from "@/types/optimizer";
import type { IngestedItem } from "@/types/ingestion";
import type { DispatchOrder } from "@/types/dispatch";

interface CheckoutPassModalProps {
  open: boolean;
  onClose: () => void;
  items: IngestedItem[];
  basket: OptimizedBasket;
  order?: DispatchOrder | null;
  wallet: CheckoutWalletState;
}

type SlideKind = "pass" | "loyalty" | "voucher";

interface CarouselSlide {
  kind: SlideKind;
  id: string;
  title: string;
}

export function CheckoutPassModal({
  open,
  onClose,
  items,
  basket,
  order,
  wallet,
}: CheckoutPassModalProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [wakeHint, setWakeHint] = useState<string | null>(null);

  const qrPayload = useMemo(
    () => buildUniversalCheckoutQrPayload(basket, items, order ?? undefined),
    [basket, items, order],
  );

  const slides = useMemo((): CarouselSlide[] => {
    const list: CarouselSlide[] = [{ kind: "pass", id: "pass", title: "Pass caisse" }];
    for (const card of wallet.loyaltyCards) {
      list.push({ kind: "loyalty", id: card.id, title: card.label });
    }
    for (const voucher of wallet.vouchers) {
      list.push({ kind: "voucher", id: voucher.id, title: voucher.label });
    }
    return list;
  }, [wallet]);

  const activeSlide = slides[slideIndex] ?? slides[0];

  useEffect(() => {
    if (!open) return undefined;
    let sentinel: Awaited<ReturnType<typeof acquireScreenWakeLock>> = null;
    void acquireScreenWakeLock().then((lock) => {
      sentinel = lock;
      setWakeHint(lock ? "Écran maintenu actif en caisse" : "Wake Lock non disponible sur cet appareil");
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      void releaseScreenWakeLock(sentinel);
      setWakeHint(null);
    };
  }, [open, onClose]);

  const go = useCallback(
    (delta: number) => {
      setSlideIndex((i) => (i + delta + slides.length) % slides.length);
    },
    [slides.length],
  );

  const onDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
      if (info.offset.x < -80 || info.velocity.x < -400) go(1);
      else if (info.offset.x > 80 || info.velocity.x > 400) go(-1);
    },
    [go],
  );

  const bundleSummary = useMemo((): ExportBundle => ({
    phase: order ? "dispatch" : "optimizer",
    items,
    basket,
    order: order ?? undefined,
    createdAt: new Date().toISOString(),
  }), [basket, items, order]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="neria-checkout-pass-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-pass-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <header className="neria-checkout-pass-header">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5" aria-hidden />
              <div>
                <p className="neria-checkout-pass-kicker">Pass caisse · haute lisibilité</p>
                <h2 id="checkout-pass-title" className="neria-checkout-pass-title">
                  {activeSlide?.title ?? "Pass universel"}
                </h2>
              </div>
            </div>
            <button
              type="button"
              className="neria-checkout-pass-close"
              onClick={onClose}
              aria-label="Fermer le pass caisse"
            >
              <X className="h-6 w-6" />
            </button>
          </header>

          {wakeHint && (
            <p className="neria-checkout-pass-wake-hint">{wakeHint}</p>
          )}

          <div className="neria-checkout-pass-body">
            <motion.div
              key={activeSlide?.id}
              className="neria-card neria-checkout-pass-card"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={onDragEnd}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
            >
              {activeSlide?.kind === "pass" && (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="neria-checkout-pass-qr-wrap">
                    <QRCodeSVG value={qrPayload} size={220} level="M" includeMargin />
                  </div>
                  <p className="text-sm font-semibold">
                    Total optimisé · {basket.savings.optimizedTotal.toFixed(2)} €
                  </p>
                  <p className="text-xs opacity-80">
                    Économies {basket.savings.savingsAmount.toFixed(2)} € ·{" "}
                    {basket.savings.storeCount} enseigne(s)
                  </p>
                  <span className="neria-badge-tag inline-flex items-center gap-1">
                    <ScanLine className="h-3.5 w-3.5" />
                    QR universel CourseUp
                  </span>
                </div>
              )}

              {activeSlide?.kind === "loyalty" && (() => {
                const card = wallet.loyaltyCards.find((c) => c.id === activeSlide.id);
                if (!card) return null;
                return (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-xs uppercase tracking-wide opacity-70">{card.issuer}</p>
                    <p className="text-lg font-bold">{card.label}</p>
                    <div className="neria-checkout-pass-qr-wrap">
                      <QRCodeSVG value={card.barcodePayload} size={200} level="L" />
                    </div>
                    <p className="font-mono text-sm">{card.memberId}</p>
                  </div>
                );
              })()}

              {activeSlide?.kind === "voucher" && (() => {
                const voucher = wallet.vouchers.find((v) => v.id === activeSlide.id);
                if (!voucher) return null;
                return (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="neria-badge-savings">
                      −{voucher.valueEuro.toFixed(2)} €
                    </span>
                    <p className="text-lg font-bold">{voucher.label}</p>
                    <p className="font-mono text-2xl font-bold tracking-widest">{voucher.code}</p>
                    {voucher.expiresAt && (
                      <p className="text-xs opacity-70">Valide jusqu&apos;au {voucher.expiresAt}</p>
                    )}
                  </div>
                );
              })()}
            </motion.div>

            <div className="neria-checkout-pass-carousel-nav">
              <button type="button" className="neria-checkout-pass-nav-btn" onClick={() => go(-1)}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`neria-checkout-pass-dot ${i === slideIndex ? "neria-checkout-pass-dot-active" : ""}`}
                    aria-label={`Carte ${i + 1}`}
                    onClick={() => setSlideIndex(i)}
                  />
                ))}
              </div>
              <button type="button" className="neria-checkout-pass-nav-btn" onClick={() => go(1)}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <footer className="neria-checkout-pass-footer">
            <p className="text-[11px] opacity-75">
              {bundleSummary.phase === "dispatch" && order
                ? `Commande ${order.id}`
                : "Prévisualisation panier — scan en caisse"}
            </p>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
