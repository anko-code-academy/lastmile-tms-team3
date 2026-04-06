"use client";

import { useRouter } from "next/navigation";
import type { ParcelListItem } from "@/lib/types/parcel";
import { ParcelStatusBadge } from "@/components/parcels/ParcelStatusBadge";

type SortableParcelField = "trackingNumber" | "status" | "createdAt";

interface ParcelTableProps {
  items: ParcelListItem[];
  sortField: SortableParcelField | null;
  sortDir: SortDir;
  onSort: (field: SortableParcelField) => void;
}

type SortDir = "asc" | "desc";

function SortIcon({
  sortField,
  sortDir,
}: {
  sortField: SortableParcelField | null;
  sortDir: SortDir;
}) {
  return (
    <span className="ml-1 text-muted-foreground">
      {sortField ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

export function ParcelTable({
  items,
  sortField,
  sortDir,
  onSort,
}: ParcelTableProps) {
  const router = useRouter();

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => onSort("trackingNumber")}
            >
              Tracking number{" "}
              <SortIcon
                sortField={sortField === "trackingNumber" ? sortField : null}
                sortDir={sortDir}
              />
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Recipient
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => onSort("status")}
            >
              Status{" "}
              <SortIcon
                sortField={sortField === "status" ? sortField : null}
                sortDir={sortDir}
              />
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              City
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Zone
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Service
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Weight
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Type
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => onSort("createdAt")}
            >
              Created{" "}
              <SortIcon
                sortField={sortField === "createdAt" ? sortField : null}
                sortDir={sortDir}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-12 text-center text-muted-foreground"
              >
                No parcels found.
              </td>
            </tr>
          ) : (
            items.map((parcel) => (
              <tr
                key={parcel.id}
                className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => router.push(`/parcels/${parcel.id}`)}
              >
                <td className="px-4 py-3 font-medium font-mono text-xs">
                  {parcel.trackingNumber}
                </td>
                <td className="px-4 py-3">{parcel.recipientName}</td>
                <td className="px-4 py-3">
                  <ParcelStatusBadge status={parcel.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {parcel.recipientCity}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {parcel.zoneName ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {parcel.serviceType.charAt(0) +
                    parcel.serviceType.slice(1).toLowerCase()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {parcel.weight} {parcel.weightUnit.toLowerCase()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {parcel.parcelType ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(parcel.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
