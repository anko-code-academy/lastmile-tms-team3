"use server";

import { auth } from "@/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface ParcelImportRowDto {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
}

export interface ParcelImportPreviewDto {
  importId: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ParcelImportRowDto[];
}

export interface ParcelImportResultDto {
  importId: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  parcelsCreated: number;
  createdParcelTrackingNumbers: string[];
  errors: ParcelImportRowDto[];
}

export interface ImportHistoryDto {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  parcelsCreated: number;
  createdAt: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await auth();
  const token = session?.accessToken as string;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function previewImportAction(file: File): Promise<ParcelImportPreviewDto | { error: string }> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/parcel-imports/preview`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) return { error: "Please log in to import parcels" };
      const text = await response.text();
      return { error: text || "Preview failed" };
    }

    const data = await response.json();
    return {
      importId: data.importId,
      fileName: data.fileName,
      totalRows: data.totalRows,
      validRows: data.validRows,
      invalidRows: data.invalidRows,
      rows: data.rows.map((r: { rowNumber: number; isValid: boolean; errors: string[] }) => ({
        rowNumber: r.rowNumber,
        isValid: r.isValid,
        errors: r.errors || [],
      })),
    };
  } catch {
    return { error: "Failed to connect to server" };
  }
}

export async function confirmImportAction(importId: string): Promise<ParcelImportResultDto | { error: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/parcel-imports/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ importId }),
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) return { error: "Please log in to import parcels" };
      const text = await response.text();
      return { error: text || "Import failed" };
    }

    const data = await response.json();
    return {
      importId: data.importId,
      fileName: data.fileName,
      status: data.status,
      totalRows: data.totalRows,
      validRows: data.validRows,
      invalidRows: data.invalidRows,
      parcelsCreated: data.parcelsCreated,
      createdParcelTrackingNumbers: data.createdParcelTrackingNumbers || [],
      errors: (data.errors || []).map((e: { rowNumber: number; errors: string[] }) => ({
        rowNumber: e.rowNumber,
        isValid: false,
        errors: e.errors || [],
      })),
    };
  } catch {
    return { error: "Failed to connect to server" };
  }
}

export async function getImportHistoryAction(): Promise<ImportHistoryDto[] | { error: string }> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/api/parcel-imports/history`, {
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) return { error: "Please log in to view import history" };
      return { error: "Failed to load import history" };
    }

    const data = await response.json();
    return data.map((h: ImportHistoryDto) => ({
      id: h.id,
      fileName: h.fileName,
      fileType: h.fileType,
      status: h.status,
      totalRows: h.totalRows,
      validRows: h.validRows,
      invalidRows: h.invalidRows,
      parcelsCreated: h.parcelsCreated,
      createdAt: h.createdAt,
    }));
  } catch {
    return { error: "Failed to connect to server" };
  }
}
