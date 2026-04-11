import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { searchParcelsAction } from "@/lib/actions/parcels";
import { ParcelSearch } from "@/components/parcels/ParcelSearch";
import {
  ParcelSortBy,
  ParcelStatus,
  SortDirection,
  type SearchParcelInput,
} from "@/lib/types/parcel";
import TmNavbar from "@/components/TmNavbar";

const S = {
  accent: "#f59e0b" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

type ParcelsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ParcelsPage({ searchParams }: ParcelsPageProps) {
  const session = await auth();
  if (!session) redirect("/login");

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialInput = buildInitialInput(resolvedSearchParams);

  // Fetch first page with defaults on load
  const initialResult = await searchParcelsAction(initialInput);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "#e2e8f0", position: "relative", overflow: "hidden" }}>
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)",
        backgroundSize: "52px 52px",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <TmNavbar />
        <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
          <div style={{ marginBottom: "2rem", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: S.mono, fontSize: "10px", letterSpacing: ".2em", color: S.accent, textTransform: "uppercase", marginBottom: ".375rem" }}>
                Operations Center
              </p>
              <h1 style={{ fontFamily: S.mono, fontSize: "1.5rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-.02em", lineHeight: 1 }}>
                Parcels
              </h1>
            </div>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <Link
                href="/parcels/import"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest transition-colors"
                style={{
                  background: "rgba(16,185,129,.12)",
                  border: "1px solid rgba(16,185,129,.35)",
                  color: "#10b981",
                }}
              >
                Bulk Import
              </Link>
              <Link
                href="/parcels/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest transition-colors"
                style={{
                  background: "rgba(245,158,11,.12)",
                  border: "1px solid rgba(245,158,11,.35)",
                  color: S.accent,
                }}
              >
                + New Parcel
              </Link>
            </div>
          </div>
          <ParcelSearch initialResult={initialResult} initialInput={initialInput} />
        </div>
      </div>
    </div>
  );
}

function buildInitialInput(
  searchParams: Record<string, string | string[] | undefined>,
): SearchParcelInput {
  return {
    search: getSingle(searchParams.search),
    status: parseStatuses(searchParams.status),
    dateFrom: getSingle(searchParams.dateFrom),
    dateTo: getSingle(searchParams.dateTo),
    createdBefore: getSingle(searchParams.createdBefore),
    currentStatusChangedBefore: getSingle(
      searchParams.currentStatusChangedBefore,
    ),
    zoneIds: parseCsvValues(searchParams.zoneId),
    depotId: getSingle(searchParams.depotId),
    parcelType: getSingle(searchParams.parcelType),
    sortBy: parseSortBy(getSingle(searchParams.sortBy)),
    sortDirection: parseSortDirection(getSingle(searchParams.sortDirection)),
    cursor: null,
    pagingDirection: "forward",
    pageSize: 20,
  };
}

function getSingle(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function parseCsvValues(value: string | string[] | undefined): string[] | null {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const parsed = values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return parsed.length > 0 ? parsed : null;
}

function parseStatuses(
  value: string | string[] | undefined,
): ParcelStatus[] | null {
  const values = parseCsvValues(value);
  if (!values) {
    return null;
  }

  const validStatuses = values.filter((item): item is ParcelStatus =>
    Object.values(ParcelStatus).includes(item as ParcelStatus),
  );

  return validStatuses.length > 0 ? validStatuses : null;
}

function parseSortBy(value: string | null): ParcelSortBy {
  if (value && Object.values(ParcelSortBy).includes(value as ParcelSortBy)) {
    return value as ParcelSortBy;
  }

  return ParcelSortBy.CreatedAt;
}

function parseSortDirection(value: string | null): SortDirection {
  if (value && Object.values(SortDirection).includes(value as SortDirection)) {
    return value as SortDirection;
  }

  return SortDirection.Desc;
}
