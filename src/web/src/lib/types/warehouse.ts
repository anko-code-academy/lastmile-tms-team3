export interface WarehouseBinDto {
  id: string;
  name: string;
  code: string;
  labelCode: string;
  capacityParcelCount: number;
  currentParcelCount: number;
  utilizationPercent: number;
  canEdit: boolean;
  canDelete: boolean;
  canDeactivate: boolean;
  isActive: boolean;
  notes?: string | null;
}

export interface WarehouseAisleDto {
  aisleId: string;
  aisleName: string;
  code: string;
  sortOrder: number;
  currentParcelCount: number;
  canEdit: boolean;
  canDelete: boolean;
  canDeactivate: boolean;
  isActive: boolean;
  bins: WarehouseBinDto[];
}

export interface WarehouseZoneDto {
  zoneId: string;
  zoneName: string;
  isActive: boolean;
  aisles: WarehouseAisleDto[];
}

export interface WarehouseDepotDto {
  depotId: string;
  depotName: string;
  zones: WarehouseZoneDto[];
}

export interface CreateAisleDto {
  zoneId: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  notes?: string;
}

export interface UpdateAisleDto {
  id: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  notes?: string;
}

export interface AisleMutationDto {
  id: string;
  zoneId: string;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  notes?: string | null;
}

export interface CreateBinDto {
  aisleId: string;
  name: string;
  code: string;
  capacityParcelCount: number;
  isActive: boolean;
  notes?: string;
}

export interface UpdateBinDto {
  id: string;
  name: string;
  code: string;
  capacityParcelCount: number;
  isActive: boolean;
  notes?: string;
}

export interface BinMutationDto {
  id: string;
  aisleId: string;
  name: string;
  code: string;
  labelCode: string;
  capacityParcelCount: number;
  currentParcelCount: number;
  utilizationPercent: number;
  isActive: boolean;
  notes?: string | null;
}
