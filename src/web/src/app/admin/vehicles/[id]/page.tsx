import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getVehicleAction, updateVehicleAction } from "@/lib/actions/vehicles";
import { getDepotsAction } from "@/lib/actions/depots";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import { VehicleStatusForm } from "@/components/vehicles/VehicleStatusForm";
import { VehicleStatusBadge } from "@/components/vehicles/VehicleStatusBadge";
import type { UpdateVehicleInput } from "@/lib/types/vehicle";

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VehicleDetailPage({
  params,
}: VehicleDetailPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session?.user?.role !== "OperationsManager") {
    redirect("/");
  }

  const vehicle = await getVehicleAction(id);

  if (!vehicle) {
    redirect("/admin/vehicles");
  }

  const [depots] = await Promise.all([getDepotsAction()]);

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-4">
        <Link
          href="/admin/vehicles"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All Vehicles
        </Link>
      </div>
      <div className="mb-6">
        <p className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
          Fleet Management
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">
            {vehicle.registrationPlate}
          </h1>
          <VehicleStatusBadge status={vehicle.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {vehicle.type} · {vehicle.depot?.name ?? "No depot assigned"}
        </p>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-border p-6">
        <h2 className="text-sm font-medium mb-4">Status</h2>
        <VehicleStatusForm vehicleId={id} currentStatus={vehicle.status} />
      </div>

      <div className="mt-6 rounded-xl border border-border p-6">
        <h2 className="text-sm font-medium mb-4">Vehicle Details</h2>
        <VehicleForm
          vehicle={vehicle}
          depots={depots}
          isReadOnly={true}
          onSubmit={async (input: UpdateVehicleInput) => {
            "use server";
            return updateVehicleAction(id, input);
          }}
        />
      </div>
    </div>
  );
}
