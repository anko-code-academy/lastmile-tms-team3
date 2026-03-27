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
  query GetDrivers($depotId: UUID, $isActive: Boolean) {
    drivers(depotId: $depotId, isActive: $isActive) {
      ${DRIVER_FIELDS}
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
