"use server";

import type { ParcelLabel } from "@/lib/types/parcel";

interface ParcelLabelResponse {
  id: string;
  trackingNumber: string;
  barcodeData: string;
  recipientName: string | null;
  recipientAddress: string;
  zoneName: string | null;
  parcelType: string | null;
  serviceType: string;
  pdfBase64: string;
}

export async function getParcelLabelAction(
  parcelId: string
): Promise<ParcelLabel | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const token = process.env.API_TOKEN;

  if (!token) {
    throw new Error("API token not configured");
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

  const response = await fetch(`${baseUrl}/graphql`, {
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

export async function downloadParcelLabelPdf(parcelId: string, trackingNumber: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const token = process.env.API_TOKEN;

  if (!token) {
    throw new Error("API token not configured");
  }

  const response = await fetch(`${baseUrl}/api/labels/${parcelId}/pdf`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `label-${trackingNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadParcelLabelZpl(parcelId: string, trackingNumber: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const token = process.env.API_TOKEN;

  if (!token) {
    throw new Error("API token not configured");
  }

  const response = await fetch(`${baseUrl}/api/labels/${parcelId}/zpl`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ZPL: ${response.statusText}`);
  }

  const text = await response.text();
  const blob = new Blob([text], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `label-${trackingNumber}.zpl`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadBulkParcelLabelsPdf(parcelIds: string[]) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const token = process.env.API_TOKEN;

  if (!token) {
    throw new Error("API token not configured");
  }

  const params = new URLSearchParams();
  parcelIds.forEach((id) => params.append("ids", id));

  const response = await fetch(`${baseUrl}/api/labels/bulk/pdf?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download bulk PDF: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `labels-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
