export interface NotificationPreferences {
  proximityAlerts: boolean;
  n2oTierAlerts: boolean;
  driveReminders: boolean;
  /** Dernier palier N2O déjà notifié (index). */
  lastTierIndex: number;
  /** Cooldown proximité par magasin (storeId → timestamp ms). */
  proximityCooldown: Record<string, number>;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  proximityAlerts: true,
  n2oTierAlerts: true,
  driveReminders: true,
  lastTierIndex: 0,
  proximityCooldown: {},
};

export type NotificationPermissionState = NotificationPermission | "unsupported";
