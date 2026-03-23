import { graphql } from "./graphql";
import { ZoneDto, CreateZoneDto, UpdateZoneDto } from "../types/zone";

const ZONES_QUERY = `
  query GetZones($includeInactive: Boolean) {
    zones(includeInactive: $includeInactive) {
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

const ZONE_QUERY = `
  query GetZone($id: ID!) {
    zone(id: $id) {
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

export async function getZones(depotId?: string, includeInactive?: boolean): Promise<ZoneDto[]> {
  const variables: Record<string, unknown> = {};
  if (depotId !== undefined) variables.depotId = depotId;
  if (includeInactive !== undefined) variables.includeInactive = includeInactive;

  const data = await graphql<{ zones: ZoneDto[] }>(ZONES_QUERY, variables);
  return data.zones;
}

export async function getZone(id: string): Promise<ZoneDto> {
  const data = await graphql<{ zone: ZoneDto }>(ZONE_QUERY, { id });
  return data.zone;
}

export async function createZone(dto: CreateZoneDto): Promise<ZoneDto> {
  const data = await graphql<{ createZone: ZoneDto }>(CREATE_ZONE_MUTATION, {
    input: dto,
  });
  return data.createZone;
}

export async function updateZone(dto: UpdateZoneDto): Promise<ZoneDto> {
  const data = await graphql<{ updateZone: ZoneDto }>(UPDATE_ZONE_MUTATION, {
    input: dto,
  });
  return data.updateZone;
}

export async function deleteZone(id: string): Promise<boolean> {
  const data = await graphql<{ deleteZone: boolean }>(DELETE_ZONE_MUTATION, {
    id,
  });
  return data.deleteZone;
}
