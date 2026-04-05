import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { searchParcelsAction } from "@/lib/actions/parcels";
import { ParcelSearch } from "@/components/parcels/ParcelSearch";
import { ParcelSortBy, SortDirection } from "@/lib/types/parcel";

const S = {
  accent: "#f59e0b" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

export default async function ParcelsPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Fetch first page with defaults on load
  const initialResult = await searchParcelsAction({
    search: null,
    status: null,
    dateFrom: null,
    dateTo: null,
    zoneIds: null,
    parcelType: null,
    sortBy: ParcelSortBy.CreatedAt,
    sortDirection: SortDirection.Desc,
    cursor: null,
    pagingDirection: "forward",
    pageSize: 20,
  });

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
        <Link
          href="/parcels/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-widest transition-colors"
          style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)", color: S.accent }}
        >
          + New Parcel
        </Link>
      </div>

      <ParcelSearch initialResult={initialResult} />
    </div>
  );
}
