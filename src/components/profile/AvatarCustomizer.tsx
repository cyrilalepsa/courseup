import { motion } from "framer-motion";
import { Camera, Check } from "lucide-react";
import { useCallback, useState } from "react";
import { UserAvatar } from "@/components/common/UserAvatar";
import { isNeriaPremiumUser, saveNeriaAvatar } from "@/services/neriaAuthService";
import type {
  NeriaAvatarAccessory,
  NeriaHairColor,
  NeriaHairStyle,
  NeriaSkinTone,
  NeriaUnifiedAvatar,
} from "@/types/neriaAvatar";
import { DEFAULT_NERIA_AVATAR } from "@/types/neriaAvatar";
import type { NeriaUser } from "@/types/neriaAuth";
const STEPS = ["Carnation", "Coiffure", "Couleur", "Accessoires"] as const;

const SKIN_OPTIONS: { id: NeriaSkinTone; label: string }[] = [
  { id: "porcelain", label: "Porcelaine" },
  { id: "sand", label: "Sable" },
  { id: "honey", label: "Miel" },
  { id: "cocoa", label: "Cacao" },
  { id: "espresso", label: "Espresso" },
];

const HAIR_STYLES: { id: NeriaHairStyle; label: string }[] = [
  { id: "crop", label: "Court" },
  { id: "bob", label: "Carré" },
  { id: "waves", label: "Ondulé" },
  { id: "curls", label: "Bouclé" },
  { id: "bun", label: "Chignon" },
];

const HAIR_COLORS: { id: NeriaHairColor; label: string }[] = [
  { id: "noir", label: "Noir" },
  { id: "brun", label: "Brun" },
  { id: "chatain", label: "Châtain" },
  { id: "blond", label: "Blond" },
  { id: "roux", label: "Roux" },
  { id: "argent", label: "Argent" },
];

const ACCESSORIES: { id: NeriaAvatarAccessory; label: string }[] = [
  { id: "none", label: "Aucun" },
  { id: "glasses", label: "Lunettes" },
  { id: "earrings", label: "Boucles" },
  { id: "headband", label: "Bandeau" },
  { id: "beret", label: "Béret" },
];

interface AvatarCustomizerProps {
  user: NeriaUser;
  onSaved?: () => void;
}

export function AvatarCustomizer({ user, onSaved }: AvatarCustomizerProps) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<NeriaUnifiedAvatar>(
    user.avatar ?? DEFAULT_NERIA_AVATAR,
  );
  const [saved, setSaved] = useState(false);

  const patch = useCallback((partial: Partial<NeriaUnifiedAvatar>) => {
    setDraft((prev) => ({ ...prev, ...partial, photoDataUrl: undefined }));
    setSaved(false);
  }, []);

  const onPhotoPick = useCallback((file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : undefined;
      if (!dataUrl) return;
      setDraft((prev) => ({ ...prev, photoDataUrl: dataUrl }));
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const persist = useCallback(() => {
    saveNeriaAvatar({
      ...draft,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    onSaved?.();
  }, [draft, onSaved]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-white/30 bg-white/50 p-3 backdrop-blur-md">
        <UserAvatar
          displayName={user.displayName}
          avatar={draft}
          premium={isNeriaPremiumUser(user)}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Avatar unifié NeriaCorp</p>
          <p className="text-[11px] text-slate-600">
            Propagé instantanément vers Heritia, MamanDouce via le pont SSO.
          </p>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-violet-700">
            <Camera className="h-3.5 w-3.5" />
            Importer une photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPhotoPick(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <div className="flex gap-1">
        {STEPS.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={`flex-1 rounded-lg px-1 py-1.5 text-[9px] font-semibold ${
              step === index
                ? "bg-violet-600 text-white shadow"
                : "bg-white/60 text-slate-600"
            }`}
          >
            {index + 1}. {label}
          </button>
        ))}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {step === 0 &&
          SKIN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ skinTone: opt.id })}
              className={`rounded-xl border px-2 py-2 text-[11px] font-medium ${
                draft.skinTone === opt.id
                  ? "border-violet-500 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white/80 text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        {step === 1 &&
          HAIR_STYLES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ hairStyle: opt.id })}
              className={`rounded-xl border px-2 py-2 text-[11px] font-medium ${
                draft.hairStyle === opt.id
                  ? "border-violet-500 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white/80 text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        {step === 2 &&
          HAIR_COLORS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ hairColor: opt.id })}
              className={`rounded-xl border px-2 py-2 text-[11px] font-medium ${
                draft.hairColor === opt.id
                  ? "border-violet-500 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white/80 text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        {step === 3 &&
          ACCESSORIES.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ accessory: opt.id })}
              className={`rounded-xl border px-2 py-2 text-[11px] font-medium ${
                draft.accessory === opt.id
                  ? "border-violet-500 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white/80 text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
      </motion.div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="flex-1 rounded-xl border border-slate-200 bg-white/70 py-2 text-xs font-semibold text-slate-700"
        >
          Précédent
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="neria-cta-primary flex-1 py-2 text-xs"
          >
            Suivant
          </button>
        ) : (
          <button
            type="button"
            onClick={persist}
            className="neria-cta-n2o flex flex-1 items-center justify-center gap-1 py-2 text-xs"
          >
            <Check className="h-3.5 w-3.5" />
            Enregistrer
          </button>
        )}
      </div>
      {saved && (
        <p className="text-center text-[10px] font-medium text-emerald-700">
          Avatar synchronisé sur le pont inter-apps.
        </p>
      )}
    </div>
  );
}
