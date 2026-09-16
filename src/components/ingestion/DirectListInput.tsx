import { motion } from "framer-motion";
import { Plus, Search, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { ITEM_TAG_DEFINITIONS } from "@/config/itemCatalog";
import { createIngestedItem } from "@/features/ingestion/mockIngestion";
import {
  driveHitToItemAttributes,
  searchDriveProducts,
} from "@/services/api/driveConnectorService";
import { getFilterDefinitions } from "@/services/filterService";
import {
  findAutocompleteSuggestions,
  mergeItemAttributes,
} from "@/services/itemAttributeService";
import type { DriveProductHit } from "@/types/driveApi";
import type { IngestedItem, ItemCategory } from "@/types/ingestion";
import type { ItemAttributes } from "@/types/item";
import { EMPTY_ITEM_ATTRIBUTES } from "@/types/item";
import { ItemBadgeRow } from "@/components/item/ItemBadgeRow";

interface DirectListInputProps {
  onItemsAdded: (items: IngestedItem[]) => void;
}

export function DirectListInput({ onItemsAdded }: DirectListInputProps) {
  const [draftName, setDraftName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("u");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchFilterIds, setSearchFilterIds] = useState<string[]>([]);
  const [itemCategory, setItemCategory] = useState<ItemCategory>("épicerie");
  const [attributeDraft, setAttributeDraft] = useState<ItemAttributes>({
    ...EMPTY_ITEM_ATTRIBUTES,
  });

  const filterDefinitions = useMemo(() => getFilterDefinitions(), []);

  const localSuggestions = useMemo(
    () => findAutocompleteSuggestions(draftName, 4),
    [draftName],
  );

  const driveResults = useMemo(() => {
    const text = draftName.trim();
    if (!text || text.includes("\n") || text.length < 2) {
      return { hits: [] as DriveProductHit[] };
    }
    return searchDriveProducts({
      text,
      filterIds: searchFilterIds,
      limit: 8,
    });
  }, [draftName, searchFilterIds]);

  const toggleSearchFilter = useCallback((filterId: string) => {
    setSearchFilterIds((prev) =>
      prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId],
    );
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTags((prev) => {
      const exists = prev.includes(tagId);
      const next = exists ? prev.filter((id) => id !== tagId) : [...prev, tagId];
      const def = ITEM_TAG_DEFINITIONS.find((t) => t.id === tagId);
      if (def) {
        setAttributeDraft((attrs) =>
          exists ? attrs : mergeItemAttributes(attrs, def.apply),
        );
      }
      return next;
    });
  }, []);

  const applySuggestion = useCallback((label: string, defaults?: Partial<ItemAttributes>) => {
    setDraftName(label);
    if (defaults) {
      setAttributeDraft((attrs) => mergeItemAttributes(attrs, defaults));
    }
  }, []);

  const applyDriveHit = useCallback((hit: DriveProductHit) => {
    setDraftName(hit.name);
    setItemCategory(hit.category);
    setAttributeDraft(driveHitToItemAttributes(hit));
    setUnit(hit.category === "frais" ? (hit.name.toLowerCase().includes("lait") ? "L" : "u") : "u");
  }, []);

  const addItem = useCallback(() => {
    const name = draftName.trim();
    if (!name) return;

    let attributes = attributeDraft;
    for (const tagId of selectedTags) {
      const def = ITEM_TAG_DEFINITIONS.find((t) => t.id === tagId);
      if (def) attributes = mergeItemAttributes(attributes, def.apply);
    }

    const item = createIngestedItem(
      {
        name,
        quantity,
        unit,
        category: itemCategory,
        attributes,
        qualityScore: attributes.qualityScore,
      },
      "text",
    );

    onItemsAdded([item]);
    setDraftName("");
    setQuantity(1);
    setUnit("u");
    setSelectedTags([]);
    setAttributeDraft({ ...EMPTY_ITEM_ATTRIBUTES });
  }, [attributeDraft, draftName, itemCategory, onItemsAdded, quantity, selectedTags, unit]);

  const addBulkLines = useCallback(() => {
    const lines = draftName
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length <= 1) return;
    const items = lines.map((line) =>
      createIngestedItem({ name: line, attributes: { ...EMPTY_ITEM_ATTRIBUTES } }, "text"),
    );
    onItemsAdded(items);
    setDraftName("");
  }, [draftName, onItemsAdded]);

  return (
    <motion.div
      className="neria-card space-y-4 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
          Saisie directe · Drive API
        </p>
        <p className="text-sm text-slate-600">
          Recherche multi-critères, auto-complétion locale et catalogue connecteurs Drive.
        </p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium text-slate-600">Filtres recherche</p>
        <div className="flex flex-wrap gap-2">
          {filterDefinitions.map((filter) => {
            const active = searchFilterIds.includes(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => toggleSearchFilter(filter.id)}
                className={`neria-badge-tag transition ${
                  active ? "ring-2 ring-violet-500 ring-offset-1" : "opacity-80"
                }`}
                title={filter.description}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="direct-item-name" className="text-xs font-medium text-slate-600">
          Article ou liste (1 ligne = 1 produit)
        </label>
        <textarea
          id="direct-item-name"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          rows={3}
          placeholder={"Lait demi-écrémé\nRiz basmati\nTomates"}
          className="neria-input w-full resize-none px-3 py-2.5 text-sm"
        />

        {driveResults.hits.length > 0 && !draftName.includes("\n") && (
          <ul className="rounded-xl border border-blue-200 bg-white py-1 shadow-sm">
            <li className="px-3 py-1 text-[10px] font-semibold uppercase text-blue-600">
              <Search className="mr-1 inline h-3 w-3" />
              Résultats Drive
            </li>
            {driveResults.hits.map((hit) => (
              <li key={hit.sku} className="border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => applyDriveHit(hit)}
                  className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-blue-50"
                >
                  <span className="text-sm font-medium text-slate-900">{hit.name}</span>
                  <span className="text-[11px] text-slate-600">
                    {hit.connectorLabel} · {hit.aisleLabel} · {hit.priceEuro.toFixed(2)} €
                  </span>
                  <ItemBadgeRow attributes={driveHitToItemAttributes(hit)} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {localSuggestions.length > 0 && draftName.trim() && !draftName.includes("\n") && (
          <ul className="rounded-xl border border-slate-200 bg-white py-1 shadow-sm">
            {localSuggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => applySuggestion(s.label, s.defaultAttributes)}
                  className="flex w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-blue-50"
                >
                  <Sparkles className="mr-2 inline h-3.5 w-3.5 text-violet-500" />
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-slate-600">Quantité</label>
          <input
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
            className="neria-input mt-1 w-full px-2 py-1.5"
          />
        </div>
        <div>
          <label className="text-[11px] text-slate-600">Unité</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="neria-input mt-1 w-full px-2 py-1.5"
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium text-slate-600">Tags / régimes</p>
        <div className="flex flex-wrap gap-2">
          {ITEM_TAG_DEFINITIONS.map((tag) => {
            const active = selectedTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`neria-badge-tag transition ${
                  active ? "ring-2 ring-blue-500 ring-offset-1" : "opacity-80"
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <motion.button
          type="button"
          onClick={addItem}
          className="neria-cta-primary inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm"
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="h-4 w-4" />
          Ajouter à la liste
        </motion.button>
        {draftName.includes("\n") && (
          <button
            type="button"
            onClick={addBulkLines}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800"
          >
            Importer {draftName.split("\n").filter(Boolean).length} lignes
          </button>
        )}
      </div>
    </motion.div>
  );
}
