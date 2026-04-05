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
  RecipientName = "RECIPIENT_NAME",
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
  barcodeData: string;
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
  notes?: string;
  zoneId?: string;
  zoneName?: string;
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

export interface CreateAddressInput {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  isResidential?: boolean;
  contactName?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
}

export interface CreateParcelInput {
  description?: string;
  serviceType: ServiceType;
  recipientAddress: CreateAddressInput;
  shipperAddress: CreateAddressInput;
  weight: number;
  weightUnit: WeightUnit;
  length: number;
  width: number;
  height: number;
  dimensionUnit: DimensionUnit;
  declaredValue: number;
  currency?: string;
  parcelType?: string;
  notes?: string;
}

// Zod schemas
import { z } from "zod";

export const createAddressSchema = z.object({
  street1: z.string().min(1, "Street address is required"),
  street2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  countryCode: z.string().length(2, "Use ISO 3166-1 alpha-2 country code"),
  isResidential: z.boolean().default(false),
  contactName: z.string().optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export const createParcelSchema = z.object({
  description: z.string().max(500).optional(),
  serviceType: z.nativeEnum(ServiceType),
  recipientAddress: createAddressSchema,
  shipperAddress: createAddressSchema,
  weight: z.number().positive("Weight must be greater than 0"),
  weightUnit: z.nativeEnum(WeightUnit),
  length: z.number().positive("Length must be greater than 0"),
  width: z.number().positive("Width must be greater than 0"),
  height: z.number().positive("Height must be greater than 0"),
  dimensionUnit: z.nativeEnum(DimensionUnit),
  declaredValue: z.number().nonnegative("Declared value cannot be negative"),
  currency: z.string().max(3).default("USD"),
  parcelType: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});
