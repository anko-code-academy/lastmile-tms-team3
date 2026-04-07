"use server";

import { auth } from "@/auth";
import type { ParcelLabel } from "@/lib/types/parcel";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export async function getParcelLabelAction(
  parcelId: string
): Promise<ParcelLabel | null> {
  const token = (await auth())?.accessToken;

  if (!token) {
    throw new Error("Not authenticated");
  }

  const query = `
    query GetParcelLabel($id: UUID!) {
      parcelLabel(id: $id) {
        id
        trackingNumber
        barcodeData
        recipientName
        recipientAddress
        zoneName
        parcelType
        serviceType
        pdfBase64
      }
    }
  `;

  const response = await fetch(`${API_URL}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables: { id: parcelId },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch parcel label: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0]?.message ?? "GraphQL error");
  }

  return data.data?.parcelLabel ?? null;
}

export async function downloadParcelLabelPdf(parcelId: string, _trackingNumber: string) {
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

export async function downloadParcelLabelZpl(parcelId: string, _trackingNumber: string) {
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
