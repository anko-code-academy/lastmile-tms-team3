import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createVehicleAction } from "@/lib/actions/vehicles";
import { getDepotsAction } from "@/lib/actions/depots";
import { VehicleForm } from "@/components/vehicles/VehicleForm";
import type {
  CreateVehicleInput,
  UpdateVehicleInput,
} from "@/lib/types/vehicle";

export default async function NewVehiclePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "OperationsManager") {
    redirect("/");
  }

  const depots = await getDepotsAction();

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-6">
        <p className="text-xs font-mono uppercase tracking-widest text-amber-400 mb-1">
          Fleet Management
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Add Vehicle</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register a new vehicle in the fleet.
        </p>
      </div>

      <div className="rounded-xl border border-border p-6">
        <VehicleForm
          depots={depots}
          onSubmit={
            createVehicleAction as (
              input: CreateVehicleInput | UpdateVehicleInput,
            ) => Promise<{ error?: string; vehicleId?: string } | void>
          }
        />
      </div>
    </div>
  );
}
