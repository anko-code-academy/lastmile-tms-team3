export const GET_ROUTES = `
  query GetRoutes($first: Int, $after: String, $last: Int, $before: String, $where: DeliveryRouteFilterInput, $order: [DeliveryRouteSortInput!]) {
    routes(first: $first, after: $after, last: $last, before: $before, where: $where, order: $order) {
      nodes {
        id
        date
        zoneId
        zoneName
        driverId
        driverName
        vehicleId
        vehiclePlate
        status
        parcelCount
        estimatedStops
        estimatedDistance
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

export const GET_ROUTE = `
  query GetRoute($id: UUID!) {
    route(id: $id) {
      id
      date
      zoneId
      zoneName
      driverId
      driverName
      vehicleId
      vehiclePlate
      status
      parcelCount
      estimatedStops
      estimatedDistance
      routeParcels {
        parcelId
        stopOrder
        addedAt
        parcel {
          id
          trackingNumber
          status
        }
      }
      createdAt
      lastModifiedAt
    }
  }
`;

export const CREATE_ROUTE = `
  mutation CreateRoute($input: CreateRouteDtoInput!) {
    createRoute(input: $input) {
      id
      date
      zoneId
      zoneName
      driverId
      driverName
      vehicleId
      vehiclePlate
      status
      parcelCount
      estimatedStops
      estimatedDistance
      createdAt
      lastModifiedAt
    }
  }
`;

export const ADD_PARCELS_TO_ROUTE = `
  mutation AddParcelsToRoute($input: AddParcelsToRouteDtoInput!) {
    addParcelsToRoute(input: $input) {
      id
      status
      parcelCount
      estimatedStops
    }
  }
`;

export const REMOVE_PARCEL_FROM_ROUTE = `
  mutation RemoveParcelFromRoute($input: RemoveParcelFromRouteDtoInput!) {
    removeParcelFromRoute(input: $input) {
      id
      status
      parcelCount
      estimatedStops
    }
  }
`;

export const AUTO_ASSIGN_PARCELS = `
  mutation AutoAssignParcels($routeId: UUID!) {
    autoAssignParcels(routeId: $routeId) {
      id
      status
      parcelCount
      estimatedStops
    }
  }
`;

export const DELETE_ROUTE = `
  mutation DeleteRoute($routeId: UUID!) {
    deleteRoute(routeId: $routeId)
  }
`;
