export const GET_USERS = `
  query GetUsers($search: String, $role: UserRole) {
    users(search: $search, role: $role) {
      id
      firstName
      lastName
      email
      role
      isActive
    }
  }
`;
