import { graphql } from "./graphql";
import { ZoneDto, CreateZoneDto, UpdateZoneDto, GeoJsonPolygonDto } from "../types/zone";

const ZONES_QUERY = `
  query GetZones($includeInactive: Boolean) {
    zones(includeInactive: $includeInactive) {
      id
      name
      boundary
      isActive
      depotId
      depot { id name }
      createdAt
      lastModifiedAt
    }
  }
`;

const ZONE_QUERY = `
  query GetZone($id: ID!) {
    zone(id: $id) {
      id
      name
      boundary
      isActive
      depotId
      depot { id name }
      createdAt
      lastModifiedAt
    }
  }
`;

const CREATE_ZONE_MUTATION = `
  mutation CreateZone($input: CreateZoneDtoInput!) {
    createZone(input: $input) {
      id
      name
      boundary {
        coordinates {
          longitude
          latitude
        }
      }
      isActive
      depotId
      depotName
      createdAt
      lastModifiedAt
    }
  }
`;

const UPDATE_ZONE_MUTATION = `
  mutation UpdateZone($input: UpdateZoneDtoInput!) {
    updateZone(input: $input) {
      id
      name
      boundary {
        coordinates {
          longitude
          latitude
        }
      }
      isActive
      depotId
      depotName
      createdAt
      lastModifiedAt
    }
  }
`;

const DELETE_ZONE_MUTATION = `
  mutation DeleteZone($id: ID!) {
    deleteZone(id: $id)
  }
`;

// Parses WKT POLYGON string into GeoJsonPolygonDto
function parseWkt(wkt: string | null): GeoJsonPolygonDto | null {
  if (!wkt) return null;
  const match = wkt.match(/POLYGON\s*\(\s*\((.+)\)\s*\)/i);
  if (!match) return null;
  const coordPairs = match[1].split(",").map((pair) => {
    const [lon, lat] = pair.trim().split(/\s+/).map(Number);
    return { longitude: lon, latitude: lat };
  });
  // WKT closes the ring; remove the duplicate last point
  if (coordPairs.length > 1 && coordPairs[0].longitude === coordPairs[coordPairs.length - 1].longitude && coordPairs[0].latitude === coordPairs[coordPairs.length - 1].latitude) {
    coordPairs.pop();
  }
  return { coordinates: coordPairs };
}

function mapZone(raw: Record<string, unknown>): ZoneDto {
  return {
    ...raw,
    boundary: parseWkt(raw.boundary as string | null),
  } as ZoneDto;
}

export async function getZones(depotId?: string, includeInactive?: boolean): Promise<ZoneDto[]> {
  const variables: Record<string, unknown> = {};
  if (depotId !== undefined) variables.depotId = depotId;
  if (includeInactive !== undefined) variables.includeInactive = includeInactive;

  const data = await graphql<{ zones: Record<string, unknown>[] }>(ZONES_QUERY, variables);
  return data.zones.map(mapZone);
}

export async function getZone(id: string): Promise<ZoneDto> {
  const data = await graphql<{ zone: Record<string, unknown> }>(ZONE_QUERY, { id });
  return mapZone(data.zone);
}

export async function createZone(dto: CreateZoneDto): Promise<ZoneDto> {
  const data = await graphql<{ createZone: Record<string, unknown> }>(CREATE_ZONE_MUTATION, {
    input: dto,
  });
  return mapZone(data.createZone);
}

export async function updateZone(dto: UpdateZoneDto): Promise<ZoneDto> {
  const data = await graphql<{ updateZone: Record<string, unknown> }>(UPDATE_ZONE_MUTATION, {
    input: dto,
  });
  return mapZone(data.updateZone);
}

export async function deleteZone(id: string): Promise<boolean> {
  const data = await graphql<{ deleteZone: boolean }>(DELETE_ZONE_MUTATION, {
    id,
  });
  return data.deleteZone;
}
