"use client";

import { useRouter } from "next/navigation";
import type { ParcelListItem } from "@/lib/types/parcel";
import { ParcelStatusBadge } from "@/components/parcels/ParcelStatusBadge";

type LocalSortField =
  | "trackingNumber"
  | "recipientName"
  | "status"
  | "createdAt"
  | "city"
  | "zone"
  | "service"
  | "weight"
  | "parcelType";

interface ParcelTableProps {
  items: ParcelListItem[];
  localSortField: LocalSortField | null;
  localSortDir: SortDir;
  onSort: (field: LocalSortField) => void;
}

type SortDir = "asc" | "desc";

function SortIcon({
  field,
  sortField,
  sortDir,
}: {
  field: LocalSortField;
  sortField: LocalSortField | null;
  sortDir: SortDir;
}) {
  if (sortField !== field) return null;
  return (
    <span className="ml-1 text-muted-foreground">
      {sortDir === "asc" ? "↑" : "↓"}
    </span>
  );
}

export function ParcelTable({
  items,
  localSortField,
  localSortDir,
  onSort,
}: ParcelTableProps) {
  const router = useRouter();

  const sorted =
    localSortField == null
      ? items
      : [...items].sort((a, b) => {
          let cmp = 0;
          switch (localSortField) {
            case "trackingNumber":
              cmp = a.trackingNumber.localeCompare(b.trackingNumber);
              break;
            case "recipientName":
              cmp = a.recipientName.localeCompare(b.recipientName);
              break;
            case "status":
              cmp = a.status.localeCompare(b.status);
              break;
            case "city":
              cmp = a.recipientCity.localeCompare(b.recipientCity);
              break;
            case "createdAt":
              cmp =
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime();
              break;
            case "zone":
              cmp = (a.zoneName ?? "").localeCompare(b.zoneName ?? "");
              break;
            case "service":
              cmp = a.serviceType.localeCompare(b.serviceType);
              break;
            case "weight":
              cmp = a.weight - b.weight;
              break;
            case "parcelType":
              cmp = (a.parcelType ?? "").localeCompare(b.parcelType ?? "");
              break;
            default:
              cmp = 0;
              break;
          }
          return localSortDir === "asc" ? cmp : -cmp;
        });

  function toggleSort(field: LocalSortField) {
    if (localSortField === field) {
      onSort(field); // parent toggles dir
    } else {
      onSort(field);
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("trackingNumber")}
            >
              Tracking number{" "}
              <SortIcon
                field="trackingNumber"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("recipientName")}
            >
              Recipient{" "}
              <SortIcon
                field="recipientName"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("status")}
            >
              Status{" "}
              <SortIcon
                field="status"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("city")}
            >
              City{" "}
              <SortIcon
                field="city"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("zone")}
            >
              Zone{" "}
              <SortIcon
                field="zone"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("service")}
            >
              Service{" "}
              <SortIcon
                field="service"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("weight")}
            >
              Weight{" "}
              <SortIcon
                field="weight"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("parcelType")}
            >
              Type{" "}
              <SortIcon
                field="parcelType"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
            <th
              className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
              onClick={() => toggleSort("createdAt")}
            >
              Created{" "}
              <SortIcon
                field="createdAt"
                sortField={localSortField}
                sortDir={localSortDir}
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-12 text-center text-muted-foreground"
              >
                No parcels found.
              </td>
            </tr>
          ) : (
            sorted.map((parcel) => (
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
