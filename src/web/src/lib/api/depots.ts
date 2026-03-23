import { graphql } from "./graphql";
import { DepotDto, CreateDepotDto, UpdateDepotDto } from "../types/depot";

const DEPOTS_QUERY = `
  query GetDepots($includeInactive: Boolean) {
    depots(includeInactive: $includeInactive) {
      id
      name
      address {
        street1
        street2
        city
        state
        postalCode
        countryCode
        isResidential
        contactName
        companyName
        phone
        email
        latitude
        longitude
      }
      isActive
      operatingHours {
        schedule {
          dayOfWeek
          startTime
          endTime
        }
        daysOff {
          date
          isPaid
          reason
        }
      }
      createdAt
      lastModifiedAt
    }
  }
`;

const DEPOT_QUERY = `
  query GetDepot($id: ID!) {
    depot(id: $id) {
      id
      name
      address {
        street1
        street2
        city
        state
        postalCode
        countryCode
        isResidential
        contactName
        companyName
        phone
        email
        latitude
        longitude
      }
      isActive
      operatingHours {
        schedule {
          dayOfWeek
          startTime
          endTime
        }
        daysOff {
          date
          isPaid
          reason
        }
      }
      createdAt
      lastModifiedAt
    }
  }
`;

const CREATE_DEPOT_MUTATION = `
  mutation CreateDepot($input: CreateDepotDtoInput!) {
    createDepot(input: $input) {
      id
      name
      address {
        street1
        street2
        city
        state
        postalCode
        countryCode
        isResidential
        contactName
        companyName
        phone
        email
        latitude
        longitude
      }
      isActive
      operatingHours {
        schedule {
          dayOfWeek
          startTime
          endTime
        }
        daysOff {
          date
          isPaid
          reason
        }
      }
      createdAt
      lastModifiedAt
    }
  }
`;

const UPDATE_DEPOT_MUTATION = `
  mutation UpdateDepot($input: UpdateDepotDtoInput!) {
    updateDepot(input: $input) {
      id
      name
      address {
        street1
        street2
        city
        state
        postalCode
        countryCode
        isResidential
        contactName
        companyName
        phone
        email
        latitude
        longitude
      }
      isActive
      operatingHours {
        schedule {
          dayOfWeek
          startTime
          endTime
        }
        daysOff {
          date
          isPaid
          reason
        }
      }
      createdAt
      lastModifiedAt
    }
  }
`;

const DELETE_DEPOT_MUTATION = `
  mutation DeleteDepot($id: ID!) {
    deleteDepot(id: $id)
  }
`;

export async function getDepots(includeInactive?: boolean): Promise<DepotDto[]> {
  const data = await graphql<{ depots: DepotDto[] }>(DEPOTS_QUERY, {
    includeInactive,
  });
  return data.depots;
}

export async function getDepot(id: string): Promise<DepotDto> {
  const data = await graphql<{ depot: DepotDto }>(DEPOT_QUERY, { id });
  return data.depot;
}

export async function createDepot(dto: CreateDepotDto): Promise<DepotDto> {
  const data = await graphql<{ createDepot: DepotDto }>(CREATE_DEPOT_MUTATION, {
    input: dto,
  });
  return data.createDepot;
}

export async function updateDepot(dto: UpdateDepotDto): Promise<DepotDto> {
  const data = await graphql<{ updateDepot: DepotDto }>(UPDATE_DEPOT_MUTATION, {
    input: dto,
  });
  return data.updateDepot;
}

export async function deleteDepot(id: string): Promise<boolean> {
  const data = await graphql<{ deleteDepot: boolean }>(DELETE_DEPOT_MUTATION, {
    id,
  });
  return data.deleteDepot;
}
