"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VehicleStatusBadge } from "@/components/vehicles/VehicleStatusBadge";
import type { Vehicle } from "@/lib/types/vehicle";
import { VehicleStatus } from "@/lib/types/vehicle";

type SortField = "registrationPlate" | "type" | "status" | "createdAt";
type SortDir = "asc" | "desc";

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return null;
  return (
    <span className="ml-1 text-muted-foreground">
      {sortDir === "asc" ? "↑" : "↓"}
    </span>
  );
}

const STATUS_FILTER_OPTIONS: { label: string; value: VehicleStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Available", value: VehicleStatus.Available },
  { label: "In Use", value: VehicleStatus.InUse },
  { label: "Maintenance", value: VehicleStatus.Maintenance },
  { label: "Retired", value: VehicleStatus.Retired },
];

interface VehicleListProps {
  initialVehicles: Vehicle[];
}

export function VehicleList({ initialVehicles }: VehicleListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "ALL">("ALL");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = initialVehicles
    .filter((v) => {
      const matchesSearch = v.registrationPlate
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "registrationPlate":
          cmp = a.registrationPlate.localeCompare(b.registrationPlate);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by plate..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-64"
        />

        <Button
          variant="default"
          size="sm"
          onClick={() => router.push("/admin/vehicles/new")}
        >
          <Plus className="size-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
                onClick={() => toggleSort("registrationPlate")}
              >
                Plate <SortIcon field="registrationPlate" sortField={sortField} sortDir={sortDir} />
              </th>
              <th
                className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
                onClick={() => toggleSort("type")}
              >
                Type <SortIcon field="type" sortField={sortField} sortDir={sortDir} />
              </th>
              <th
                className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
                onClick={() => toggleSort("status")}
              >
                Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} />
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Capacity
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Depot
              </th>
              <th
                className="cursor-pointer select-none px-4 py-3 text-left font-medium text-muted-foreground"
                onClick={() => toggleSort("createdAt")}
              >
                Created <SortIcon field="createdAt" sortField={sortField} sortDir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {search || statusFilter !== "ALL"
                    ? "No vehicles match your filters."
                    : "No vehicles yet. Add one to get started."}
                </td>
              </tr>
            ) : (
              filtered.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`/admin/vehicles/${vehicle.id}`)}
                >
                  <td className="px-4 py-3 font-medium">
                    {vehicle.registrationPlate}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {vehicle.type}
                  </td>
                  <td className="px-4 py-3">
                    <VehicleStatusBadge status={vehicle.status} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {vehicle.parcelCapacity} parcels · {vehicle.weightCapacity}{" "}
                    {vehicle.weightUnit.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {vehicle.depot?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(vehicle.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {initialVehicles.length} vehicles
      </p>
    </div>
  );
}
