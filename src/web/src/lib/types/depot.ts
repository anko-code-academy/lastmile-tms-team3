// Depot types matching the backend DTOs

export interface AddressDto {
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

export interface OperatingHoursDto {
  schedule: DailyAvailabilityDto[];
  daysOff: DayOffDto[];
}

export interface DailyAvailabilityDto {
  dayOfWeek: string;
  startTime?: string;
  endTime?: string;
}

export interface DayOffDto {
  date: string;
  isPaid: boolean;
  reason?: string;
}

export interface DepotDto {
  id: string;
  name: string;
  address: AddressDto;
  isActive: boolean;
  operatingHours: OperatingHoursDto;
  createdAt: string;
  lastModifiedAt?: string;
}

export interface CreateDepotDto {
  name: string;
  address: CreateAddressDto;
  isActive: boolean;
  operatingHours?: OperatingHoursDto;
}

export interface CreateAddressDto {
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
}

export interface UpdateDepotDto extends CreateDepotDto {
  id: string;
}