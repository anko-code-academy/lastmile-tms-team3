export enum RouteStatus {
  Draft = "DRAFT",
  Active = "ACTIVE",
  Completed = "COMPLETED",
}

export interface RouteParcel {
  id: string;
  trackingNumber: string;
  status: string;
  serviceType: string;
  weight: number;
  weightUnit: string;
  declaredValue: number;
  currency: string;
  recipientAddress: {
    city: string;
    state: string;
    countryCode: string;
  };
  contentItemsCount: number;
}

export interface DeliveryRoute {
  id: string;
  name: string;
  depotId: string;
  depot: { id: string; name: string };
  driverId?: string | null;
  driver?: { id: string; firstName: string; lastName: string } | null;
  zoneId?: string | null;
  zone?: { id: string; name: string } | null;
  date: string;
  status: RouteStatus;
  loadedAt?: string | null;
  parcels: RouteParcel[];
}

export interface LoadParcelInput {
  trackingNumber: string;
  routeId: string;
  operatorName?: string;
  locationCity?: string;
  locationState?: string;
  locationCountryCode?: string;
  forceLoad?: boolean;
}

export interface LoadParcelResult {
  parcelId: string;
  trackingNumber: string;
  status: string;
  isWrongRoute: boolean;
  assignedRouteName?: string | null;
  assignedRouteId?: string | null;
}

export interface CompleteLoadingInput {
  routeId: string;
  operatorName?: string;
  forceComplete?: boolean;
}

export interface UnloadedParcel {
  parcelId: string;
  trackingNumber: string;
  status: string;
}

export interface CompleteLoadingResult {
  routeId: string;
  isSuccess: boolean;
  hasUnloadedParcels: boolean;
  unloadedParcelCount: number;
  unloadedParcels: UnloadedParcel[];
}
