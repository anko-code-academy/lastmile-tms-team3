"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VehicleStatus } from "@/lib/types/vehicle";
import { setVehicleStatusAction } from "@/lib/actions/vehicles";

interface VehicleStatusFormProps {
  vehicleId: string;
  currentStatus: VehicleStatus;
}

const STATUS_OPTIONS: { label: string; value: VehicleStatus }[] = [
  { label: "Available", value: VehicleStatus.Available },
  { label: "In Use", value: VehicleStatus.InUse },
  { label: "Maintenance", value: VehicleStatus.Maintenance },
  { label: "Retired", value: VehicleStatus.Retired },
];

export function VehicleStatusForm({
  vehicleId,
  currentStatus,
}: VehicleStatusFormProps) {
  const router = useRouter();
  const [committedStatus, setCommittedStatus] =
    useState<VehicleStatus>(currentStatus);
  const [pendingStatus, setPendingStatus] = useState<VehicleStatus | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCommittedStatus(currentStatus);
  }, [currentStatus]);

  const selectedStatus = pendingStatus ?? committedStatus;
  const hasChanged =
    pendingStatus !== null && pendingStatus !== committedStatus;

  async function handleSave() {
    if (!pendingStatus || pendingStatus === committedStatus) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await setVehicleStatusAction(vehicleId, pendingStatus);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCommittedStatus(pendingStatus);
      setPendingStatus(null);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {STATUS_OPTIONS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          onClick={() => setPendingStatus(value)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
            selectedStatus === value
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border bg-background hover:bg-muted"
          }`}
        >
          {label}
        </button>
      ))}
      {hasChanged && (
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
