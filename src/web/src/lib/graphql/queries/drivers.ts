const DRIVER_LIST_ITEM_FIELDS = `
  id
  firstName
  lastName
  email
  licenseNumber
  depot {
    name
  }
  isActive
  createdAt
`;

const DRIVER_FIELDS = `
  id
  firstName
  lastName
  phone
  email
  licenseNumber
  licenseExpiryDate
  photoUrl
  depotId
  depot {
    name
  }
  userId
  isActive
  availability {
    schedule { dayOfWeek startTime endTime }
    daysOff { date isPaid reason }
  }
  createdAt
  lastModifiedAt
`;

export const GET_DRIVERS = `
  query GetDrivers($search: String, $where: DriverFilterInput, $order: [DriverSortInput!], $first: Int, $after: String, $last: Int, $before: String) {
    drivers(search: $search, where: $where, order: $order, first: $first, after: $after, last: $last, before: $before) {
      nodes {
        id
        firstName
        lastName
        email
        licenseNumber
        depot {
          name
        }
        isActive
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

export const GET_DRIVER = `
  query GetDriver($id: UUID!) {
    driver(id: $id) {
      ${DRIVER_FIELDS}
    }
  }
`;

export const CREATE_DRIVER = `
  mutation CreateDriver($input: CreateDriverDtoInput!) {
    createDriver(input: $input) {
      ${DRIVER_FIELDS}
    }
  }
`;

export const UPDATE_DRIVER = `
  mutation UpdateDriver($input: UpdateDriverDtoInput!) {
    updateDriver(input: $input) {
      ${DRIVER_FIELDS}
    }
  }
`;

export const UPDATE_DRIVER_STATUS = `
  mutation UpdateDriverStatus($input: UpdateDriverStatusDtoInput!) {
    updateDriverStatus(input: $input) {
      id
      isActive
      lastModifiedAt
    }
  }
`;

export const UPDATE_DRIVER_AVAILABILITY = `
  mutation UpdateDriverAvailability($input: UpdateDriverAvailabilityDtoInput!) {
    updateDriverAvailability(input: $input) {
      id
      availability {
        schedule { dayOfWeek startTime endTime }
        daysOff { date isPaid reason }
      }
      lastModifiedAt
    }
  }
`;

export const LINK_DRIVER_USER = `
  mutation LinkDriverUser($input: LinkDriverUserDtoInput!) {
    linkDriverUser(input: $input) {
      id
      userId
      lastModifiedAt
    }
  }
`;
