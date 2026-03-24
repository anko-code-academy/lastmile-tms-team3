export const GET_DEPOTS = `
  query GetDepots($includeInactive: Boolean) {
    depots(includeInactive: $includeInactive) {
      id
      name
    }
  }
`;
