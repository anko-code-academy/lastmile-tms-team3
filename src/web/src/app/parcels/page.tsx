import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { searchParcelsAction } from "@/lib/actions/parcels";
import { ParcelSearch } from "@/components/parcels/ParcelSearch";
import { ParcelSortBy, SortDirection } from "@/lib/types/parcel";

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
      <div className="mb-6">
        <p className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
          Operations Center
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Parcels</h1>
      </div>

      <ParcelSearch initialResult={initialResult} />
    </div>
  );
}
