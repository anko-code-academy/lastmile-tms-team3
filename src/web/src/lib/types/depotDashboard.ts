import { ParcelStatus } from "@/lib/types/parcel";

export interface ParcelStatusCount {
  status: ParcelStatus;
  count: number;
}

export interface ZoneParcelSummary {
  zoneId: string;
  zoneName: string;
  count: number;
  statusCounts: ParcelStatusCount[];
  agingStatusCounts: ParcelStatusCount[];
}

export interface ParcelAgingAlerts {
  totalCount: number;
  statusCounts: ParcelStatusCount[];
}

export interface DepotParcelDashboard {
  statusCounts: ParcelStatusCount[];
  zoneBreakdown: ZoneParcelSummary[];
  agingAlerts: ParcelAgingAlerts;
  lastUpdatedAt: string;
}

export interface DepotDashboardViewModel {
  id: string;
  name: string;
  parcelDashboard: DepotParcelDashboard;
}
