import { getFilterDefinitions, countMatchingItems } from "@/services/filterService";

interface NutritionFilterPanelProps {
  itemsCount: number;
  allItems: import("@/types/ingestion").IngestedItem[];
  activeFilterIds: string[];
  onToggleFilter: (filterId: string) => void;
}

export function NutritionFilterPanel({
  itemsCount,
  allItems,
  activeFilterIds,
  onToggleFilter,
}: NutritionFilterPanelProps) {
  const filters = getFilterDefinitions();

  return (
    <div className="neria-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
        Filtres nutrition & régimes
      </p>
      <p className="mt-1 text-[11px] text-slate-600">
        {itemsCount} article{itemsCount > 1 ? "s" : ""} visibles dans l&apos;optimiseur
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = activeFilterIds.includes(filter.id);
          const matches = countMatchingItems(allItems, filter.id);
          return (
            <button
              key={filter.id}
              type="button"
              title={filter.description}
              onClick={() => onToggleFilter(filter.id)}
              className={`neria-badge-tag transition ${
                active ? "ring-2 ring-cyan-500 ring-offset-1" : "opacity-85"
              }`}
            >
              {filter.label} · {matches}
            </button>
          );
        })}
      </div>
    </div>
  );
}
