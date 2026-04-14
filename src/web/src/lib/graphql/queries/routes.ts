export const GET_ROUTES = `
  query GetRoutes($first: Int, $after: String, $last: Int, $before: String, $where: DeliveryRouteFilterInput, $order: [DeliveryRouteSortInput!]) {
    routes(first: $first, after: $after, last: $last, before: $before, where: $where, order: $order) {
      nodes {
        id
        date
        depotId
        depot {
          id
          name
        }
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
        estimatedDuration
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
      name
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
      estimatedDuration
      depot {
        id
        name
        address {
          latitude
          longitude
        }
      }
      routeParcels {
        parcelId
        stopOrder
        addedAt
        parcel {
          id
          trackingNumber
          status
          recipientAddress {
            latitude
            longitude
            city
            street1
          }
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

export const ASSIGN_DRIVER_TO_ROUTE = `
  mutation AssignDriverToRoute($input: AssignDriverToRouteDtoInput!) {
    assignDriverToRoute(input: $input) {
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
      estimatedDuration
      createdAt
      lastModifiedAt
    }
  }
`;

export const ASSIGN_VEHICLE_TO_ROUTE = `
  mutation AssignVehicleToRoute($input: AssignVehicleToRouteDtoInput!) {
    assignVehicleToRoute(input: $input) {
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
      estimatedDuration
      createdAt
      lastModifiedAt
    }
  }
`;

export const UNASSIGN_DRIVER_FROM_ROUTE = `
  mutation UnassignDriverFromRoute($input: UnassignFromRouteDtoInput!) {
    unassignDriverFromRoute(input: $input) {
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
      estimatedDuration
      createdAt
      lastModifiedAt
    }
  }
`;

export const UNASSIGN_VEHICLE_FROM_ROUTE = `
  mutation UnassignVehicleFromRoute($input: UnassignFromRouteDtoInput!) {
    unassignVehicleFromRoute(input: $input) {
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
      estimatedDuration
      createdAt
      lastModifiedAt
    }
  }
`;

export const GET_AVAILABLE_DRIVERS = `
  query GetAvailableDrivers($date: LocalDate!) {
    availableDrivers(date: $date) {
      id
      fullName
      routeCount
    }
  }
`;

export const OPTIMIZE_ROUTE_STOPS = `
  mutation OptimizeRouteStops($routeId: UUID!) {
    optimizeRouteStops(routeId: $routeId) {
      id
      status
      parcelCount
      estimatedStops
      estimatedDistance
      estimatedDuration
    }
  }
`;

export const REORDER_ROUTE_STOPS = `
  mutation ReorderRouteStops($input: ReorderStopsDtoInput!) {
    reorderRouteStops(input: $input) {
      id
      status
      parcelCount
      estimatedStops
      estimatedDistance
      estimatedDuration
    }
  }
`;

export const GET_ROUTES_MAP = `
  query GetRoutesMap($date: LocalDate!) {
    routesForMap(date: $date) {
      id
      name
      status
      driverName
      vehiclePlate
      depot {
        id
        name
        address {
          latitude
          longitude
        }
      }
      routeParcels {
        parcelId
        stopOrder
        parcel {
          id
          trackingNumber
          status
          recipientAddress {
            latitude
            longitude
            city
            street1
          }
        }
      }
    }
  }
`;

export const DISPATCH_ROUTE = `
  mutation DispatchRoute($input: DispatchRouteDtoInput!) {
    dispatchRoute(input: $input) {
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
      estimatedDuration
      createdAt
      lastModifiedAt
    }
  }
`;

export const ADD_PARCELS_TO_ACTIVE_ROUTE = `
  mutation AddParcelsToActiveRoute($input: AddParcelsToRouteDtoInput!) {
    addParcelsToActiveRoute(input: $input) {
      id
      status
      parcelCount
      estimatedStops
    }
  }
`;

export const REMOVE_PARCEL_FROM_ACTIVE_ROUTE = `
  mutation RemoveParcelFromActiveRoute($input: RemoveParcelFromRouteDtoInput!) {
    removeParcelFromActiveRoute(input: $input) {
      id
      status
      parcelCount
      estimatedStops
    }
  }
`;
