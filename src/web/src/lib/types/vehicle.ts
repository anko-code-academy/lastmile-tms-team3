export enum VehicleType {
  Van = "VAN",
  Car = "CAR",
  Bike = "BIKE",
}

export enum VehicleStatus {
  Available = "AVAILABLE",
  InUse = "IN_USE",
  Maintenance = "MAINTENANCE",
  Retired = "RETIRED",
}

export enum WeightUnit {
  Lb = "LB",
  Kg = "KG",
}

export interface Address {
  id: string;
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
  geoLocation?: GeoLocation;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Depot {
  id: string;
  name: string;
  address?: Address;
  isActive: boolean;
  createdAt: string;
  lastModifiedAt?: string;
}

export interface Vehicle {
  id: string;
  registrationPlate: string;
  type: VehicleType;
  status: VehicleStatus;
  parcelCapacity: number;
  weightCapacity: number;
  weightUnit: WeightUnit;
  depotId: string;
  depot?: Depot;
  createdAt: string;
  lastModifiedAt?: string;
}

export interface CreateVehicleInput {
  registrationPlate: string;
  type: VehicleType;
  parcelCapacity: number;
  weightCapacity: number;
  weightUnit: WeightUnit;
  depotId: string;
}

export interface UpdateVehicleInput {
  registrationPlate?: string;
  parcelCapacity?: number;
  weightCapacity?: number;
  status?: VehicleStatus;
  depotId: string;
}
