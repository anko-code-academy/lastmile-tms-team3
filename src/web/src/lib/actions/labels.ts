"use server";

import { auth } from "@/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function downloadParcelLabelPdf(parcelId: string) {
  const token = (await auth())?.accessToken;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/labels/${parcelId}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`);
  }

  return response.blob();
}

export async function downloadParcelLabelZpl(parcelId: string) {
  const token = (await auth())?.accessToken;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/api/labels/${parcelId}/zpl`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ZPL: ${response.statusText}`);
  }

  return response.text();
}

export async function downloadBulkParcelLabelsPdf(parcelIds: string[]) {
  const token = (await auth())?.accessToken;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const params = new URLSearchParams();
  parcelIds.forEach((id) => params.append("ids", id));

  const response = await fetch(`${API_URL}/api/labels/bulk/pdf?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download bulk PDF: ${response.statusText}`);
  }

  return response.blob();
}
