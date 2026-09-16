import { ITEM_TAG_DEFINITIONS } from "@/config/itemCatalog";
import { QualityScoreBadge } from "@/components/quality/QualityScoreBadge";
import type { ItemAttributes } from "@/types/item";

interface ItemBadgeRowProps {
  attributes?: ItemAttributes;
  qualityScore?: ItemAttributes["qualityScore"];
  maxTags?: number;
  className?: string;
}

export function ItemBadgeRow({
  attributes,
  qualityScore,
  maxTags = 4,
  className = "",
}: ItemBadgeRowProps) {
  const score = qualityScore ?? attributes?.qualityScore;
  const tags = (attributes?.tags ?? []).slice(0, maxTags);

  const tagLabels = tags.map((tagId) => {
    const def = ITEM_TAG_DEFINITIONS.find((t) => t.id === tagId);
    return def?.label ?? tagId;
  });

  if (!score && tagLabels.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      <QualityScoreBadge score={score} />
      {tagLabels.map((label) => (
        <span key={label} className="neria-badge-tag">
          {label}
        </span>
      ))}
    </div>
  );
}
