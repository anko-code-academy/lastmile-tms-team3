import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getVehiclesAction } from "@/lib/actions/vehicles";
import { VehicleList } from "@/components/vehicles/VehicleList";

export default async function VehiclesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session?.user?.role !== "OperationsManager") {
    redirect("/");
  }

  const vehicles = await getVehiclesAction();

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
          Fleet Management
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
      </div>

      <VehicleList initialVehicles={vehicles} />
    </div>
  );
}
