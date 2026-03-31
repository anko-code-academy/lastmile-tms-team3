import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getParcelAction } from "@/lib/actions/parcels";
import { ParcelDetail } from "@/components/parcels/ParcelDetail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ParcelDetailPage({ params }: Props) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const parcel = await getParcelAction(id);

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/parcels"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Parcels
        </Link>
      </div>
      <ParcelDetail parcel={parcel} />
    </div>
  );
}
