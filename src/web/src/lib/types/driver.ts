export interface DriverListItem {
  id: string;
  fullName: string;
  email: string;
  licenseNumber: string;
  depotName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PagedDriversResult {
  items: DriverListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DriverSchedule {
  dayOfWeek: string;
  startTime?: string;
  endTime?: string;
}

export interface DriverDayOff {
  date: string;
  isPaid: boolean;
  reason?: string;
}

export interface DriverAvailability {
  schedule: DriverSchedule[];
  daysOff: DriverDayOff[];
}

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  photoUrl?: string;
  zoneId?: string;
  zoneName?: string;
  depotId?: string;
  depotName?: string;
  userId?: string;
  isActive: boolean;
  availability: DriverAvailability;
  createdAt: string;
  lastModifiedAt?: string;
}

export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  photoUrl?: string;
  zoneId?: string;
  depotId?: string;
}

export interface UpdateDriverInput {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  photoUrl?: string;
  zoneId?: string;
  depotId?: string;
}

export interface UpdateDriverStatusInput {
  id: string;
  isActive: boolean;
}

export interface DriverScheduleInputItem {
  dayOfWeek: string;
  startTime?: string;
  endTime?: string;
}

export interface DriverDayOffInputItem {
  date: string;
  isPaid: boolean;
  reason?: string;
}

export interface UpdateDriverAvailabilityInput {
  id: string;
  schedule: DriverScheduleInputItem[];
  daysOff: DriverDayOffInputItem[];
}

export interface LinkDriverUserInput {
  driverId: string;
  userId: string | null;
}
