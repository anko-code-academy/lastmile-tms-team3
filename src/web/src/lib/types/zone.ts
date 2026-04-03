// Zone types matching the backend DTOs

export interface GeoJsonPointDto {
  longitude: number;
  latitude: number;
}

export interface GeoJsonPolygonDto {
  coordinates: GeoJsonPointDto[];
}

export interface ZoneDto {
  id: string;
  name: string;
  boundary: GeoJsonPolygonDto | null;
  isActive: boolean;
  depotId: string;
  depot: { id: string; name: string } | null;
  createdAt: string;
  lastModifiedAt?: string;
}

export interface CreateZoneDto {
  name: string;
  depotId: string;
  boundary: GeoJsonPolygonDto | null;
  isActive: boolean;
}

export interface UpdateZoneDto extends CreateZoneDto {
  id: string;
}