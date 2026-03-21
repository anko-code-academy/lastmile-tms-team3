import { auth } from "@/auth";
import { DepotDto, CreateDepotDto, UpdateDepotDto } from "../types/depot";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function getAuthHeader(): Promise<Headers> {
  const session = await auth();
  const token = session?.accessToken;

  return new Headers({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
}

export async function getDepots(includeInactive?: boolean): Promise<DepotDto[]> {
  const headers = await getAuthHeader();
  const params = includeInactive ? "?includeInactive=true" : "";

  const res = await fetch(`${API_BASE_URL}/api/depots${params}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch depots: ${res.status}`);
  }

  return res.json();
}

export async function getDepot(id: string): Promise<DepotDto> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/depots/${id}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch depot: ${res.status}`);
  }

  return res.json();
}

export async function createDepot(dto: CreateDepotDto): Promise<DepotDto> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/depots`, {
    method: "POST",
    headers,
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    throw new Error(`Failed to create depot: ${res.status}`);
  }

  return res.json();
}

export async function updateDepot(dto: UpdateDepotDto): Promise<DepotDto> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/depots/${dto.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    throw new Error(`Failed to update depot: ${res.status}`);
  }

  return res.json();
}

export async function deleteDepot(id: string): Promise<boolean> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/depots/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to delete depot: ${res.status}`);
  }

  return true;
}