export type NeriaSkinTone = "porcelain" | "sand" | "honey" | "cocoa" | "espresso";

export type NeriaHairStyle = "crop" | "bob" | "waves" | "curls" | "bun";

export type NeriaHairColor = "noir" | "brun" | "chatain" | "blond" | "roux" | "argent";

export type NeriaAvatarAccessory = "none" | "glasses" | "earrings" | "headband" | "beret";

export interface NeriaUnifiedAvatar {
  skinTone: NeriaSkinTone;
  hairStyle: NeriaHairStyle;
  hairColor: NeriaHairColor;
  accessory: NeriaAvatarAccessory;
  /** Photo importée (data URL) — prioritaire sur le rendu vectoriel. */
  photoDataUrl?: string;
  updatedAt: string;
}

export const DEFAULT_NERIA_AVATAR: NeriaUnifiedAvatar = {
  skinTone: "sand",
  hairStyle: "waves",
  hairColor: "chatain",
  accessory: "none",
  updatedAt: new Date(0).toISOString(),
};
