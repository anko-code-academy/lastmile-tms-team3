const DRIVER_LIST_ITEM_FIELDS = `
  id
  fullName
  email
  licenseNumber
  depotName
  isActive
  createdAt
`;

const DRIVER_FIELDS = `
  id
  firstName
  lastName
  fullName
  phone
  email
  licenseNumber
  licenseExpiryDate
  photoUrl
  zoneId
  zoneName
  depotId
  depotName
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
  query GetDrivers($depotId: UUID, $isActive: Boolean, $search: String, $page: Int, $pageSize: Int) {
    drivers(depotId: $depotId, isActive: $isActive, search: $search, page: $page, pageSize: $pageSize) {
      items { ${DRIVER_LIST_ITEM_FIELDS} }
      totalCount
      page
      pageSize
      totalPages
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
