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

export const GET_USER = `
  query GetUser($id: UUID!) {
    user(id: $id) {
      id
      firstName
      lastName
      email
      role
      isActive
    }
  }
`;
