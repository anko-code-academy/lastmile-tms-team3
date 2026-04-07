import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getParcelAction } from "@/lib/actions/parcels";
import { ParcelDetail } from "@/components/parcels/ParcelDetail";
import TmNavbar from "@/components/TmNavbar";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ParcelDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const parcel = await getParcelAction(id);

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
        <div style={{ padding: "2rem", maxWidth: "960px", margin: "0 auto" }}>
          <ParcelDetail parcel={parcel} />
        </div>
      </div>
    </div>
  );
}
