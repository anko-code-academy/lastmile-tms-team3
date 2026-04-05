export const GET_VEHICLES = `
  query GetVehicles($first: Int, $after: String, $last: Int, $before: String, $search: String, $where: VehicleFilterInput, $order: [VehicleSortInput!]) {
    vehicles(first: $first, after: $after, last: $last, before: $before, search: $search, where: $where, order: $order) {
      nodes {
        id
        registrationPlate
        type
        status
        parcelCapacity
        weightCapacity
        weightUnit
        depotId
        depot {
          id
          name
        }
        createdAt
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`;

export const GET_VEHICLE = `
  query GetVehicle($id: UUID!) {
    vehicle(id: $id) {
      id
      registrationPlate
      type
      status
      parcelCapacity
      weightCapacity
      weightUnit
      depotId
      depot {
        id
        name
        address {
          id
          street1
          street2
          city
          state
          postalCode
          countryCode
        }
      }
      createdAt
      lastModifiedAt
    }
  }
`;

export const CREATE_VEHICLE = `
  mutation CreateVehicle($input: CreateVehicleDtoInput!) {
    createVehicle(input: $input) {
      id
      registrationPlate
      type
      status
      parcelCapacity
      weightCapacity
      weightUnit
      depotId
      depot {
        id
        name
      }
      createdAt
      lastModifiedAt
    }
  }
`;

export const UPDATE_VEHICLE = `
  mutation UpdateVehicle($input: UpdateVehicleDtoInput!) {
    updateVehicle(input: $input) {
      id
      registrationPlate
      type
      status
      parcelCapacity
      weightCapacity
      weightUnit
      depotId
      depot {
        id
        name
      }
      createdAt
      lastModifiedAt
    }
  }
`;

export const UPDATE_VEHICLE_STATUS = `
  mutation UpdateVehicleStatus($input: UpdateVehicleStatusDtoInput!) {
    updateVehicleStatus(input: $input) {
      id
      status
      lastModifiedAt
    }
  }
`;
