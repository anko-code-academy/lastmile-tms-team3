import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { searchParcelsAction } from "@/lib/actions/parcels";
import { ParcelSearch } from "@/components/parcels/ParcelSearch";
import { ParcelSortBy, SortDirection } from "@/lib/types/parcel";
import TmNavbar from "@/components/TmNavbar";

export default async function ParcelsPage() {
  const session = await auth();
  if (!session) redirect("/login");

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
          <div style={{ marginBottom: "2rem" }}>
            <p style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "10px", letterSpacing: ".2em", color: "#f59e0b", textTransform: "uppercase", marginBottom: ".375rem" }}>
              Operations Center
            </p>
            <h1 style={{ fontFamily: "var(--font-geist-mono, monospace)", fontSize: "1.5rem", fontWeight: 800, color: "#e2e8f0", letterSpacing: "-.02em", lineHeight: 1 }}>
              Parcels
            </h1>
          </div>
          <ParcelSearch initialResult={initialResult} />
        </div>
      </div>
    </div>
  );
}
