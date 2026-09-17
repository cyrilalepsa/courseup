import type { NeriaUnifiedAvatar } from "@/types/neriaAvatar";
import {
  DEFAULT_NERIA_AVATAR,
  type NeriaHairColor,
  type NeriaSkinTone,
} from "@/types/neriaAvatar";

const SKIN: Record<NeriaSkinTone, string> = {
  porcelain: "#fde8d8",
  sand: "#e8b98a",
  honey: "#c68642",
  cocoa: "#8d5524",
  espresso: "#5c3317",
};

const HAIR: Record<NeriaHairColor, string> = {
  noir: "#1a1a1a",
  brun: "#4a3728",
  chatain: "#6b4423",
  blond: "#d4a574",
  roux: "#b55239",
  argent: "#9ca3af",
};

function VectorFace({ avatar, size }: { avatar: NeriaUnifiedAvatar; size: number }) {
  const skin = SKIN[avatar.skinTone];
  const hair = HAIR[avatar.hairColor];
  const hairY = avatar.hairStyle === "bun" ? 6 : avatar.hairStyle === "crop" ? 14 : 10;

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="h-full w-full"
      aria-hidden
    >
      <circle cx="32" cy="36" r="22" fill={skin} />
      <ellipse cx="32" cy={hairY + 8} rx="24" ry="16" fill={hair} />
      {avatar.hairStyle === "bob" && (
        <rect x="10" y="18" width="44" height="22" rx="10" fill={hair} />
      )}
      {avatar.hairStyle === "waves" && (
        <path
          d="M8 28 Q16 8 32 14 T56 28 L52 36 Q32 22 12 36 Z"
          fill={hair}
        />
      )}
      {avatar.hairStyle === "curls" && (
        <circle cx="14" cy="24" r="8" fill={hair} />
      )}
      {avatar.hairStyle === "bun" && <circle cx="32" cy="10" r="10" fill={hair} />}
      <circle cx="24" cy="38" r="2.5" fill="#1e293b" />
      <circle cx="40" cy="38" r="2.5" fill="#1e293b" />
      <path
        d="M26 46 Q32 50 38 46"
        stroke="#c2410c"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {avatar.accessory === "glasses" && (
        <g stroke="#334155" strokeWidth="2" fill="none">
          <circle cx="24" cy="38" r="6" />
          <circle cx="40" cy="38" r="6" />
          <path d="M30 38 H34" />
        </g>
      )}
      {avatar.accessory === "earrings" && (
        <>
          <circle cx="12" cy="40" r="2" fill="#fbbf24" />
          <circle cx="52" cy="40" r="2" fill="#fbbf24" />
        </>
      )}
      {avatar.accessory === "headband" && (
        <rect x="12" y="20" width="40" height="4" rx="2" fill="#a855f7" />
      )}
      {avatar.accessory === "beret" && (
        <ellipse cx="32" cy="16" rx="18" ry="8" fill="#1e3a8a" />
      )}
    </svg>
  );
}

export interface UserAvatarProps {
  displayName?: string;
  initials?: string;
  avatar?: NeriaUnifiedAvatar;
  premium?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_PX = { sm: 32, md: 40, lg: 56 };

export function UserAvatar({
  displayName,
  initials = "?",
  avatar,
  premium = false,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const px = SIZE_PX[size];
  const config = avatar ?? DEFAULT_NERIA_AVATAR;
  const label = displayName ? `Avatar de ${displayName}` : "Avatar utilisateur";

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      title={label}
    >
      {premium && (
        <>
          <span className="neria-avatar-halo" aria-hidden />
          <span className="neria-avatar-sparkle neria-avatar-sparkle-a" aria-hidden />
          <span className="neria-avatar-sparkle neria-avatar-sparkle-b" aria-hidden />
        </>
      )}
      <div
        className={`relative z-10 flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/90 shadow-md ${
          premium ? "ring-2 ring-amber-300/80" : "ring-1 ring-slate-200"
        }`}
      >
        {config.photoDataUrl ? (
          <img
            src={config.photoDataUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : avatar || displayName ? (
          <VectorFace avatar={config} size={px} />
        ) : (
          <span className="text-[10px] font-bold text-slate-700">{initials}</span>
        )}
      </div>
    </div>
  );
}
