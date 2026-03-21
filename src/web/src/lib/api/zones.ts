import { auth } from "@/auth";
import { ZoneDto, CreateZoneDto, UpdateZoneDto } from "../types/zone";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

async function getAuthHeader(): Promise<Headers> {
  const session = await auth();
  const token = session?.accessToken;

  return new Headers({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
}

export async function getZones(depotId?: string, includeInactive?: boolean): Promise<ZoneDto[]> {
  const headers = await getAuthHeader();
  const params = new URLSearchParams();
  if (depotId) params.append("depotId", depotId);
  if (includeInactive) params.append("includeInactive", "true");

  const queryString = params.toString();
  const res = await fetch(`${API_BASE_URL}/api/zones${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch zones: ${res.status}`);
  }

  return res.json();
}

export async function getZone(id: string): Promise<ZoneDto> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/zones/${id}`, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch zone: ${res.status}`);
  }

  return res.json();
}

export async function createZone(dto: CreateZoneDto): Promise<ZoneDto> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/zones`, {
    method: "POST",
    headers,
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    throw new Error(`Failed to create zone: ${res.status}`);
  }

  return res.json();
}

export async function updateZone(dto: UpdateZoneDto): Promise<ZoneDto> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/zones/${dto.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    throw new Error(`Failed to update zone: ${res.status}`);
  }

  return res.json();
}

export async function deleteZone(id: string): Promise<boolean> {
  const headers = await getAuthHeader();

  const res = await fetch(`${API_BASE_URL}/api/zones/${id}`, {
    method: "DELETE",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to delete zone: ${res.status}`);
  }

  return true;
}