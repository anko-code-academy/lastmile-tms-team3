"use client";

import React, { useState, useEffect } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ParcelListItem,
  ParcelSortBy,
  PagedResult,
  SearchParcelInput,
  SortDirection,
} from "@/lib/types/parcel";
import {
  ParcelStatus,
  ParcelSortBy as SortByEnum,
  SortDirection as SortDirEnum,
} from "@/lib/types/parcel";
import { ParcelTable } from "@/components/parcels/ParcelTable";
import { searchParcelsAction } from "@/lib/actions/parcels";
import { getZones } from "@/lib/api/zones";
import type { ZoneDto } from "@/lib/types/zone";

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
type SortDir = "asc" | "desc";

const STATUS_OPTIONS: { label: string; value: ParcelStatus }[] = [
  { label: "Registered", value: ParcelStatus.Registered },
  { label: "Received", value: ParcelStatus.ReceivedAtDepot },
  { label: "Sorted", value: ParcelStatus.Sorted },
  { label: "Staged", value: ParcelStatus.Staged },
  { label: "Loaded", value: ParcelStatus.Loaded },
  { label: "Out for Delivery", value: ParcelStatus.OutForDelivery },
  { label: "Delivered", value: ParcelStatus.Delivered },
  { label: "Failed Attempt", value: ParcelStatus.FailedAttempt },
  { label: "Returned", value: ParcelStatus.ReturnedToDepot },
  { label: "Cancelled", value: ParcelStatus.Cancelled },
  { label: "Exception", value: ParcelStatus.Exception },
];

const SORT_BY_OPTIONS: { label: string; value: ParcelSortBy }[] = [
  { label: "Created At", value: SortByEnum.CreatedAt },
  { label: "Tracking Number", value: SortByEnum.TrackingNumber },
  { label: "Recipient Name", value: SortByEnum.RecipientName },
  { label: "Status", value: SortByEnum.Status },
];

const PAGE_SIZE = 20;

function defaultInput(): SearchParcelInput {
  return {
    search: null,
    status: null,
    dateFrom: null,
    dateTo: null,
    zoneIds: null,
    parcelType: null,
    sortBy: SortByEnum.CreatedAt,
    sortDirection: SortDirEnum.Desc,
    cursor: null,
    pageSize: PAGE_SIZE,
  };
}

interface ParcelSearchProps {
  initialResult: PagedResult<ParcelListItem>;
}

export function ParcelSearch({ initialResult }: ParcelSearchProps) {
  const [searchParams, setSearchParams] =
    useState<SearchParcelInput>(defaultInput());
  const [searchInput, setSearchInput] =
    useState<SearchParcelInput>(defaultInput());
  const [result, setResult] =
    useState<PagedResult<ParcelListItem>>(initialResult);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<ParcelStatus[]>([]);
  const [zones, setZones] = useState<ZoneDto[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);

  // Local sort is opt-in: by default we render exactly as the server returned.
  const [localSortField, setLocalSortField] = useState<LocalSortField | null>(
    null,
  );
  const [localSortDir, setLocalSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    getZones(undefined, false)
      .then(setZones)
      .catch(() => {});
  }, []);

  async function handleSearch() {
    setIsLoading(true);
    try {
      const input: SearchParcelInput = {
        ...searchInput,
        status: selectedStatuses.length > 0 ? selectedStatuses : null,
        zoneIds: selectedZoneIds.length > 0 ? selectedZoneIds : null,
        pageSize: PAGE_SIZE,
        cursor: null,
      };
      setSearchParams(input);
      const data = await searchParcelsAction(input);
      setResult(data);
      setLocalSortField(null);
      setLocalSortDir("asc");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePrev() {
    if (!result.hasPreviousPage || !result.previousCursor) return;
    setIsLoading(true);
    try {
      const input: SearchParcelInput = {
        ...searchParams,
        cursor: result.previousCursor,
      };
      const data = await searchParcelsAction(input);
      setResult(data);
      setLocalSortField(null);
      setLocalSortDir("asc");
      // sync searchInput back to searchParams so form reflects what was searched
      setSearchInput(searchParams);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNext() {
    if (!result.hasNextPage || !result.nextCursor) return;
    setIsLoading(true);
    try {
      const input: SearchParcelInput = {
        ...searchParams,
        cursor: result.nextCursor,
      };
      const data = await searchParcelsAction(input);
      setResult(data);
      setLocalSortField(null);
      setLocalSortDir("asc");
      setSearchInput(searchParams);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLocalSort(field: LocalSortField) {
    if (localSortField === field) {
      setLocalSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setLocalSortField(field);
      setLocalSortDir("asc");
    }
  }

  function toggleStatus(status: ParcelStatus) {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  }

  function toggleZone(zoneId: string) {
    setSelectedZoneIds((prev) =>
      prev.includes(zoneId)
        ? prev.filter((id) => id !== zoneId)
        : [...prev, zoneId],
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Panel */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        {/* Full-text search */}
        <div>
          <Label
            htmlFor="search"
            className="text-xs uppercase tracking-widest text-muted-foreground mb-1"
          >
            Search
          </Label>
          <Input
            id="search"
            placeholder="Tracking number, sender, recipient, address…"
            value={searchInput.search ?? ""}
            onChange={(e) =>
              setSearchInput((p) => ({ ...p, search: e.target.value }))
            }
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>

        {/* Filters row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {/* Date From */}
          <div>
            <Label
              htmlFor="dateFrom"
              className="text-xs uppercase tracking-widest text-muted-foreground mb-1"
            >
              Date From
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={searchInput.dateFrom ?? ""}
              onChange={(e) =>
                setSearchInput((p) => ({
                  ...p,
                  dateFrom: e.target.value || null,
                }))
              }
            />
          </div>

          {/* Date To */}
          <div>
            <Label
              htmlFor="dateTo"
              className="text-xs uppercase tracking-widest text-muted-foreground mb-1"
            >
              Date To
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={searchInput.dateTo ?? ""}
              onChange={(e) =>
                setSearchInput((p) => ({
                  ...p,
                  dateTo: e.target.value || null,
                }))
              }
            />
          </div>

          {/* Parcel Type */}
          <div>
            <Label
              htmlFor="parcelType"
              className="text-xs uppercase tracking-widest text-muted-foreground mb-1"
            >
              Parcel Type
            </Label>
            <Input
              id="parcelType"
              placeholder="e.g. Standard"
              value={searchInput.parcelType ?? ""}
              onChange={(e) =>
                setSearchInput((p) => ({
                  ...p,
                  parcelType: e.target.value || null,
                }))
              }
            />
          </div>

          {/* Sort By */}
          <div>
            <Label
              htmlFor="sortBy"
              className="text-xs uppercase tracking-widest text-muted-foreground mb-1"
            >
              Sort By
            </Label>
            <select
              id="sortBy"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchInput.sortBy}
              onChange={(e) =>
                setSearchInput((p) => ({
                  ...p,
                  sortBy: e.target.value as ParcelSortBy,
                }))
              }
            >
              {SORT_BY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Direction */}
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
              Direction
            </Label>
            <div className="flex h-8 rounded-lg border border-input bg-background overflow-hidden shadow-xs">
              <button
                type="button"
                title="Ascending"
                onClick={() =>
                  setSearchInput((p) => ({
                    ...p,
                    sortDirection: SortDirEnum.Asc,
                  }))
                }
                className={`flex-1 flex items-center justify-center text-xs font-medium transition-colors ${
                  searchInput.sortDirection === SortDirEnum.Asc
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                ↑ Asc
              </button>
              <button
                type="button"
                title="Descending"
                onClick={() =>
                  setSearchInput((p) => ({
                    ...p,
                    sortDirection: SortDirEnum.Desc,
                  }))
                }
                className={`flex-1 flex items-center justify-center text-xs font-medium transition-colors border-l border-input ${
                  searchInput.sortDirection === SortDirEnum.Desc
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                ↓ Desc
              </button>
            </div>
          </div>
        </div>

        {/* Status filter */}
        <div>
          <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">
            Status
          </Label>
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatus(opt.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedStatuses.includes(opt.value)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Zone filter */}
        {zones.length > 0 && (
          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-1 block">
              Zone
            </Label>
            <div className="flex items-start flex-wrap gap-x-4">
              {Object.entries(
                zones.reduce<Record<string, typeof zones>>((acc, zone) => {
                  const depot = zone.name.split(" — ")[0] ?? zone.name;
                  (acc[depot] ??= []).push(zone);
                  return acc;
                }, {}),
              )
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([depot, depotZones], i) => (
                  <React.Fragment key={depot}>
                    {i > 0 && <div className="w-px self-stretch bg-border" />}
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-xs text-muted-foreground pl-1 whitespace-nowrap">
                        {depot}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {depotZones
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((zone) => (
                            <button
                              key={zone.id}
                              type="button"
                              onClick={() => toggleZone(zone.id)}
                              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                selectedZoneIds.includes(zone.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {zone.name.split(" — ")[1]}
                            </button>
                          ))}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
            </div>
          </div>
        )}

        {/* Search button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSearch} disabled={isLoading}>
            <Search className="size-4 mr-2" />
            Search
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {result.totalCount === 0
            ? "No results"
            : `Showing ${result.items.length} of ${result.totalCount} parcels`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrev}
            disabled={!result.hasPreviousPage || isLoading}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!result.hasNextPage || isLoading}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Table — local sort only, no API call on header click */}
      <ParcelTable
        items={result.items}
        localSortField={localSortField}
        localSortDir={localSortDir}
        onSort={handleLocalSort}
      />

      {/* Bottom pagination */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={!result.hasPreviousPage || isLoading}
        >
          <ChevronLeft className="size-4" />
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={!result.hasNextPage || isLoading}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
