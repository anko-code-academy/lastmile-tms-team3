export enum RouteStatus {
  Draft = "DRAFT",
  Dispatched = "DISPATCHED",
  InProgress = "IN_PROGRESS",
  Completed = "COMPLETED",
}

// Load-out types (PR #28)
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

// Route creation types (LMTT3-40)
export interface RouteParcelItem {
  parcelId: string;
  stopOrder: number;
  addedAt: string;
  parcel: {
    id: string;
    trackingNumber: string;
    status: string;
    recipientAddress?: {
      latitude: number;
      longitude: number;
      city: string;
      street1: string;
    };
  };
}

export interface DeliveryRoute {
  id: string;
  name: string;
  depotId: string;
  depot: {
    id: string;
    name: string;
    address?: {
      latitude: number;
      longitude: number;
    } | null;
  };
  date: string;
  zoneId: string;
  zoneName?: string;
  driverId?: string | null;
  driver?: { id: string; firstName: string; lastName: string } | null;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  status: RouteStatus;
  loadedAt?: string | null;
  dispatchedAt?: string | null;
  parcelCount: number;
  estimatedStops: number;
  estimatedDistance?: number;
  estimatedDuration?: number | null;
  parcels: RouteParcel[];
  routeParcels?: RouteParcelItem[];
  createdAt: string;
  lastModifiedAt?: string;
}

export interface CreateRouteInput {
  date: string;
  zoneId: string;
  driverId?: string;
  vehicleId?: string;
}

export interface AddParcelsToRouteInput {
  routeId: string;
  parcelIds: string[];
}

export interface RemoveParcelFromRouteInput {
  routeId: string;
  parcelId: string;
}

export interface AssignDriverToRouteInput {
  routeId: string;
  driverId: string;
}

export interface AssignVehicleToRouteInput {
  routeId: string;
  vehicleId: string;
}

export interface UnassignFromRouteInput {
  routeId: string;
}

export interface AvailableDriver {
  id: string;
  fullName: string;
  routeCount: number;
}

export interface ReorderStopEntry {
  parcelId: string;
  stopOrder: number;
}

export interface ReorderStopsInput {
  routeId: string;
  newOrder: ReorderStopEntry[];
}

export interface RouteMapStop {
  parcelId: string;
  stopOrder: number;
  trackingNumber: string;
  status: string;
  latitude: number;
  longitude: number;
  city: string;
  street1: string;
}

export interface RouteMapData {
  id: string;
  name: string;
  status: RouteStatus;
  driverName?: string | null;
  vehiclePlate?: string | null;
  depot: {
    id: string;
    name: string;
    address?: { latitude: number; longitude: number } | null;
  } | null;
  stops: RouteMapStop[];
  driverPosition?: { latitude: number; longitude: number } | null;
}
