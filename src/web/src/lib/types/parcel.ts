// Types matching backend DTOs

export enum ParcelStatus {
  Registered = "REGISTERED",
  ReceivedAtDepot = "RECEIVED_AT_DEPOT",
  Sorted = "SORTED",
  Staged = "STAGED",
  Loaded = "LOADED",
  OutForDelivery = "OUT_FOR_DELIVERY",
  Delivered = "DELIVERED",
  FailedAttempt = "FAILED_ATTEMPT",
  ReturnedToDepot = "RETURNED_TO_DEPOT",
  Cancelled = "CANCELLED",
  Exception = "EXCEPTION",
}

export enum ServiceType {
  Economy = "ECONOMY",
  Standard = "STANDARD",
  Express = "EXPRESS",
  Overnight = "OVERNIGHT",
}

export enum EventType {
  LabelCreated = "LABEL_CREATED",
  PickedUp = "PICKED_UP",
  ArrivedAtFacility = "ARRIVED_AT_FACILITY",
  DepartedFacility = "DEPARTED_FACILITY",
  InTransit = "IN_TRANSIT",
  OutForDelivery = "OUT_FOR_DELIVERY",
  Delivered = "DELIVERED",
  DeliveryAttempted = "DELIVERY_ATTEMPTED",
  Exception = "EXCEPTION",
  Returned = "RETURNED",
  AddressCorrection = "ADDRESS_CORRECTION",
  CustomsClearance = "CUSTOMS_CLEARANCE",
  HeldAtFacility = "HELD_AT_FACILITY",
}

export enum WeightUnit {
  Lb = "LB",
  Kg = "KG",
}

export enum DimensionUnit {
  Cm = "CM",
  In = "IN",
}

export enum ParcelSortBy {
  CreatedAt = "CREATED_AT",
  TrackingNumber = "TRACKING_NUMBER",
  Status = "STATUS",
}

export enum SortDirection {
  Asc = "ASC",
  Desc = "DESC",
}

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  isResidential: boolean;
  contactName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  geoLocation?: string;
}

export interface TrackingEvent {
  id: string;
  timestamp: string;
  eventType: EventType;
  description: string;
  locationCity?: string;
  locationState?: string;
  locationCountryCode?: string;
  operator?: string;
  delayReason?: string;
  createdAt: string;
}

export interface ParcelContentItem {
  id: string;
  hsCode: string;
  description: string;
  quantity: number;
  unitValue: number;
  currency: string;
  weight: number;
  weightUnit: WeightUnit;
  originCountryCode: string;
}

export interface ParcelWatcher {
  id: string;
  email: string;
  name?: string;
}

export interface DeliveryConfirmation {
  id: string;
  receivedBy?: string;
  location?: string;
  signatureImage?: string;
  photo?: string;
  deliveredAt: string;
  latitude?: number;
  longitude?: number;
  geoLocation?: string;
}

export interface ParcelListItem {
  id: string;
  trackingNumber: string;
  description?: string;
  serviceType: ServiceType;
  status: ParcelStatus;
  recipientName: string;
  recipientCity: string;
  zoneName?: string;
  parcelType?: string;
  weight: number;
  weightUnit: WeightUnit;
  declaredValue: number;
  currency: string;
  estimatedDeliveryDate?: string;
  contentItemsCount: number;
  createdAt: string;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  description?: string;
  serviceType: ServiceType;
  status: ParcelStatus;
  recipientAddress: Address;
  shipperAddress: Address;
  weight: number;
  weightUnit: WeightUnit;
  length: number;
  width: number;
  height: number;
  dimensionUnit: DimensionUnit;
  declaredValue: number;
  currency: string;
  estimatedDeliveryDate?: string;
  actualDeliveryDate?: string;
  deliveryAttempts: number;
  parcelType?: string;
  zoneId?: string;
  zone?: { name?: string };
  createdAt: string;
  lastModifiedAt?: string;
  trackingEvents: TrackingEvent[];
  contentItems: ParcelContentItem[];
  watchers: ParcelWatcher[];
  deliveryConfirmation?: DeliveryConfirmation;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export type PagingDirection = "forward" | "backward";

export interface SearchParcelInput {
  search: string | null;
  status: ParcelStatus[] | null;
  dateFrom: string | null;
  dateTo: string | null;
  zoneIds: string[] | null;
  parcelType: string | null;
  sortBy: ParcelSortBy;
  sortDirection: SortDirection;
  cursor: string | null;
  pagingDirection?: PagingDirection;
  pageSize: number;
}
