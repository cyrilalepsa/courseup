import { motion, AnimatePresence } from "framer-motion";
import { LocateFixed, MapPin, Radar, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useCourseUp } from "@/context/useCourseUp";
import {
  BRAND_LABELS,
  DRIVE_BRANDS,
  storesByBrand,
} from "@/services/locationService";
import type { SearchRadiusKm } from "@/types/store";

const RADII: SearchRadiusKm[] = [5, 10, 20];

interface StoreSelectorProps {
  variant?: "inline" | "modal";
  open?: boolean;
  onClose?: () => void;
}

export function StoreSelector({
  variant = "inline",
  open = true,
  onClose,
}: StoreSelectorProps) {
  const {
    locationPrefs,
    nearbyStores,
    selysGeofenceActive,
    setSearchRadius,
    setManualLocation,
    requestGpsLocation,
    setSelectedStore,
    isLocating,
    locationError,
  } = useCourseUp();

  const [postalInput, setPostalInput] = useState(locationPrefs.postalCode);
  const [cityInput, setCityInput] = useState(locationPrefs.city);

  const grouped = useMemo(() => storesByBrand(nearbyStores), [nearbyStores]);

  const panel = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            Drives & Selys à proximité
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Code postal actif :{" "}
            <span className="font-semibold text-slate-900">
              {locationPrefs.postalCode} {locationPrefs.city}
            </span>
          </p>
        </div>
        {variant === "modal" && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-600 hover:text-slate-900"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase text-slate-600">Rayon</p>
        <div className="flex gap-2">
          {RADII.map((radius) => (
            <button
              key={radius}
              type="button"
              onClick={() => setSearchRadius(radius)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                locationPrefs.searchRadiusKm === radius
                  ? "bg-blue-600 text-white"
                  : "border border-slate-300 bg-white text-slate-800"
              }`}
            >
              {radius} km
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input
          value={postalInput}
          onChange={(e) => setPostalInput(e.target.value)}
          placeholder="Code postal"
          className="neria-input px-3 py-2 text-sm"
        />
        <input
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder="Ville"
          className="neria-input px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setManualLocation(postalInput, cityInput)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
        >
          Appliquer
        </button>
        <button
          type="button"
          disabled={isLocating}
          onClick={() => void requestGpsLocation()}
          className="neria-cta-primary inline-flex items-center justify-center gap-1 px-3 py-2 text-xs disabled:opacity-50"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          GPS
        </button>
      </div>

      {locationError && (
        <p className="text-xs text-amber-700">{locationError}</p>
      )}

      {selysGeofenceActive && (
        <motion.div
          className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-50 px-3 py-2 text-xs text-slate-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Radar className="h-4 w-4 text-blue-600" />
          Geofencing Selys actif — vous êtes à proximité d&apos;un commerce partenaire
        </motion.div>
      )}

      <div className="space-y-3">
        {DRIVE_BRANDS.map((brand) => {
          const stores = grouped[brand];
          if (!stores.length) return null;
          return (
            <label key={brand} className="block space-y-1">
              <span className="text-[11px] font-semibold uppercase text-slate-600">
                {BRAND_LABELS[brand]}
              </span>
              <select
                value={locationPrefs.selectedStoreIds[brand] ?? stores[0].id}
                onChange={(e) => setSelectedStore(brand, e.target.value)}
                className="neria-input w-full px-3 py-2 text-sm"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name} · {store.distanceKm} km
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>

      {nearbyStores.length === 0 && (
        <p className="text-xs text-slate-600">
          Aucun magasin dans ce rayon — élargissez la recherche ou changez de code postal.
        </p>
      )}
    </div>
  );

  if (variant === "modal") {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="neria-card fixed inset-x-4 top-20 z-[70] mx-auto max-h-[75dvh] max-w-lg overflow-y-auto p-4 sm:inset-x-auto sm:w-full"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
            >
              {panel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <section className="neria-card p-4">
      <div className="mb-3 flex items-center gap-2 text-slate-800">
        <MapPin className="h-4 w-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-slate-900">Magasins favoris</h3>
      </div>
      {panel}
    </section>
  );
}
