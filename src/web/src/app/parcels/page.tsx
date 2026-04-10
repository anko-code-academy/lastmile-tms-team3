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

const S = {
  accent: "#f59e0b" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

type ParcelsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ParcelsPage({ searchParams }: ParcelsPageProps) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialInput = buildInitialInput(resolvedSearchParams);

  // Fetch first page with defaults on load
  const initialResult = await searchParcelsAction(initialInput);

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Home
        </Link>
      </div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
            Operations Center
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Parcels</h1>
        </div>
        <div className="flex gap-2">
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
