import type { CashbackLedgerEntry } from "@/types/cashback";
import type { CheckoutWalletState } from "@/types/checkout";
import type { CockpitDemoProfile, CockpitDemoRole } from "@/types/cockpitDemo";
import type { DispatchOrder } from "@/types/dispatch";
import type { ExportBundle } from "@/types/export";
import type { GamificationBadgeRecord } from "@/types/gamification";
import type { IngestedItem } from "@/types/ingestion";
import type {
  NotificationPermissionState,
  NotificationPreferences,
} from "@/types/notifications";
import type { OptimizedBasket } from "@/types/optimizer";
import type { HeritiaSyncNotice } from "@/types/heritia";
import type {
  DriveStore,
  LocationPreferences,
  SearchRadiusKm,
  StoreBrand,
} from "@/types/store";

export interface CourseUpContextValue {
  isHydrated: boolean;
  items: IngestedItem[];
  n2oBalance: number;
  ordersHistory: DispatchOrder[];
  cashbackLedger: CashbackLedgerEntry[];
  gamificationBadges: GamificationBadgeRecord[];
  checkoutWallet: CheckoutWalletState;
  cockpitDemoProfile: CockpitDemoProfile;
  heritiaSyncNotice: HeritiaSyncNotice | null;
  locationPrefs: LocationPreferences;
  nearbyStores: DriveStore[];
  selectedStores: Partial<Record<StoreBrand, DriveStore>>;
  selysGeofenceActive: boolean;
  isLocating: boolean;
  locationError: string | null;
  storeSelectorOpen: boolean;
  setStoreSelectorOpen: (open: boolean) => void;
  setItems: (items: IngestedItem[]) => void;
  addItem: (item?: Partial<IngestedItem> & Pick<IngestedItem, "name">) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  addN2OBalance: (amount: number) => void;
  creditDispatchCompletion: (
    order: DispatchOrder,
    basket: OptimizedBasket,
    bundle: ExportBundle,
  ) => void;
  redeemMerchantReward: (rewardId: string) => boolean;
  switchDemoCockpitRole: (role: CockpitDemoRole) => void;
  triggerDemoGeofenceAlert: () => Promise<boolean>;
  triggerDemoN2OSync: () => Promise<void>;
  purgeLocalCourseUpData: () => Promise<void>;
  completeShoppingHeritiaSync: (checkedItemIds?: string[]) => Promise<HeritiaSyncNotice | null>;
  triggerDemoDriveApiPush: () => Promise<void>;
  triggerDemoHeritiaExport: () => Promise<void>;
  clearHeritiaSyncNotice: () => void;
  saveOrder: (order: DispatchOrder) => Promise<void>;
  setSearchRadius: (radius: SearchRadiusKm) => void;
  setManualLocation: (postalCode: string, city: string) => void;
  requestGpsLocation: () => Promise<void>;
  setSelectedStore: (brand: StoreBrand, storeId: string) => void;
  notificationPrefs: NotificationPreferences;
  notificationPermission: NotificationPermissionState;
  notificationSettingsOpen: boolean;
  setNotificationSettingsOpen: (open: boolean) => void;
  setNotificationPref: <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => void;
  refreshNotificationPermission: () => void;
  requestNotificationsAccess: () => Promise<NotificationPermissionState>;
}
