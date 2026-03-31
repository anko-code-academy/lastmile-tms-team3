"use server";

import { gqlFetch } from "@/lib/graphql/fetch";
import { GET_USERS } from "@/lib/graphql/queries/users";

export interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export async function getUsersAction(search?: string, role?: string): Promise<UserOption[]> {
  const data = await gqlFetch<{ users: UserOption[] }>(GET_USERS, {
    search: search || null,
    role: role || null,
  });
  return data.users;
}
