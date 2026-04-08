"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import TmNavbar from "@/components/TmNavbar";
import { useDepots } from "@/lib/hooks/useDepots";
import {
  useCreateAisle,
  useCreateBin,
  useDeleteAisle,
  useDeleteBin,
  useUpdateAisle,
  useUpdateBin,
  useWarehouseBins,
} from "@/lib/hooks/useBins";
import {
  CreateAisleDto,
  CreateBinDto,
  UpdateAisleDto,
  UpdateBinDto,
  WarehouseAisleDto,
  WarehouseBinDto,
  WarehouseDepotDto,
  WarehouseZoneDto,
} from "@/lib/types/warehouse";

const S = {
  bg: "#080c14" as const,
  panel: "rgba(255,255,255,.025)" as const,
  border: "rgba(255,255,255,.07)" as const,
  text: "#e2e8f0" as const,
  muted: "#4a5f7a" as const,
  dim: "#3a526e" as const,
  accent: "#f59e0b" as const,
  inputBg: "rgba(255,255,255,.05)" as const,
  inputBorder: "rgba(255,255,255,.1)" as const,
  green: "#22c55e" as const,
  red: "#ef4444" as const,
  blue: "#38bdf8" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

type Tab = "list" | "layout";

type AisleModalState =
  | { open: false }
  | { open: true; mode: "create"; zone: WarehouseZoneDto }
  | {
      open: true;
      mode: "edit";
      zone: WarehouseZoneDto;
      aisle: WarehouseAisleDto;
    };

type BinModalState =
  | { open: false }
  | { open: true; mode: "create"; aisle: WarehouseAisleDto }
  | {
      open: true;
      mode: "edit";
      aisle: WarehouseAisleDto;
      bin: WarehouseBinDto;
    };

function TmLabel({
  children,
  htmlFor,
}: {
  children: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "block",
        fontFamily: S.mono,
        fontSize: "10px",
        letterSpacing: ".14em",
        color: S.muted,
        textTransform: "uppercase",
        marginBottom: ".4rem",
      }}
    >
      {children}
    </label>
  );
}

function TmBtn({
  children,
  onClick,
  type = "button",
  disabled,
  variant = "primary",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  title?: string;
}) {
  const variants = {
    primary: {
      background: "rgba(245,158,11,.12)",
      border: "1px solid rgba(245,158,11,.35)",
      color: S.accent,
    },
    secondary: {
      background: "rgba(255,255,255,.04)",
      border: `1px solid ${S.inputBorder}`,
      color: S.text,
    },
    ghost: {
      background: "transparent",
      border: `1px solid ${S.border}`,
      color: S.muted,
    },
    danger: {
      background: "rgba(239,68,68,.08)",
      border: "1px solid rgba(239,68,68,.25)",
      color: "#f87171",
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...variants[variant],
        fontFamily: S.mono,
        fontSize: "11px",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        padding: ".5rem .85rem",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

function getAisleActionReason(aisle: WarehouseAisleDto) {
  return aisle.canEdit
    ? undefined
    : "Only aisles with no bins or only empty bins can be edited, deactivated, or deleted.";
}

function getBinActionReason(bin: WarehouseBinDto) {
  return bin.canEdit
    ? undefined
    : "Only empty bins can be edited, made inactive, or deleted.";
}

export default function WarehouseBinsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isWarehouseManager = role === "WarehouseManager";

  const { data: depots = [] } = useDepots(false);
  const [selectedDepotId, setSelectedDepotId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("list");
  const [aisleModal, setAisleModal] = useState<AisleModalState>({
    open: false,
  });
  const [binModal, setBinModal] = useState<BinModalState>({ open: false });

  const effectiveDepotId = isWarehouseManager
    ? undefined
    : selectedDepotId || undefined;
  const { data, isLoading, error } = useWarehouseBins(effectiveDepotId);
  const createAisleMutation = useCreateAisle();
  const updateAisleMutation = useUpdateAisle();
  const createBinMutation = useCreateBin();
  const updateBinMutation = useUpdateBin();
  const deleteAisleMutation = useDeleteAisle();
  const deleteBinMutation = useDeleteBin();

  const aisleFormInitial = useMemo(() => {
    if (!aisleModal.open) {
      return { name: "", code: "", sortOrder: 1, isActive: true, notes: "" };
    }

    if (aisleModal.mode === "edit") {
      return {
        name: aisleModal.aisle.aisleName,
        code: aisleModal.aisle.code,
        sortOrder: aisleModal.aisle.sortOrder,
        isActive: aisleModal.aisle.isActive,
        notes: "",
      };
    }

    return {
      name: "",
      code: "",
      sortOrder: aisleModal.zone.aisles.length + 1,
      isActive: true,
      notes: "",
    };
  }, [aisleModal]);

  const [aisleForm, setAisleForm] = useState(aisleFormInitial);

  const binFormInitial = useMemo(() => {
    if (!binModal.open) {
      return {
        name: "",
        code: "",
        capacityParcelCount: 20,
        isActive: true,
        notes: "",
      };
    }

    if (binModal.mode === "edit") {
      return {
        name: binModal.bin.name,
        code: binModal.bin.code,
        capacityParcelCount: binModal.bin.capacityParcelCount,
        isActive: binModal.bin.isActive,
        notes: binModal.bin.notes ?? "",
      };
    }

    return {
      name: "",
      code: "",
      capacityParcelCount: 20,
      isActive: true,
      notes: "",
    };
  }, [binModal]);

  const [binForm, setBinForm] = useState(binFormInitial);

  const warehouseData = data ?? [];
  const totalBins = warehouseData.flatMap((depot) =>
    depot.zones.flatMap((zone) => zone.aisles.flatMap((aisle) => aisle.bins)),
  ).length;
  const activeBins = warehouseData
    .flatMap((depot) =>
      depot.zones.flatMap((zone) => zone.aisles.flatMap((aisle) => aisle.bins)),
    )
    .filter((bin) => bin.isActive).length;
  const occupiedCapacity = warehouseData
    .flatMap((depot) =>
      depot.zones.flatMap((zone) => zone.aisles.flatMap((aisle) => aisle.bins)),
    )
    .reduce((sum, bin) => sum + bin.currentParcelCount, 0);
  const totalCapacity = warehouseData
    .flatMap((depot) =>
      depot.zones.flatMap((zone) => zone.aisles.flatMap((aisle) => aisle.bins)),
    )
    .reduce((sum, bin) => sum + bin.capacityParcelCount, 0);

  function openCreateAisle(zone: WarehouseZoneDto) {
    setAisleModal({ open: true, mode: "create", zone });
    setAisleForm({
      name: "",
      code: "",
      sortOrder: zone.aisles.length + 1,
      isActive: true,
      notes: "",
    });
  }

  function openEditAisle(zone: WarehouseZoneDto, aisle: WarehouseAisleDto) {
    setAisleModal({ open: true, mode: "edit", zone, aisle });
    setAisleForm({
      name: aisle.aisleName,
      code: aisle.code,
      sortOrder: aisle.sortOrder,
      isActive: aisle.isActive,
      notes: "",
    });
  }

  function openCreateBin(aisle: WarehouseAisleDto) {
    setBinModal({ open: true, mode: "create", aisle });
    setBinForm({
      name: "",
      code: "",
      capacityParcelCount: 20,
      isActive: true,
      notes: "",
    });
  }

  function openEditBin(aisle: WarehouseAisleDto, bin: WarehouseBinDto) {
    setBinModal({ open: true, mode: "edit", aisle, bin });
    setBinForm({
      name: bin.name,
      code: bin.code,
      capacityParcelCount: bin.capacityParcelCount,
      isActive: bin.isActive,
      notes: bin.notes ?? "",
    });
  }

  async function submitAisle(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!aisleModal.open) return;

      if (aisleModal.mode === "create") {
        const dto: CreateAisleDto = {
          zoneId: aisleModal.zone.zoneId,
          name: aisleForm.name,
          code: aisleForm.code,
          sortOrder: aisleForm.sortOrder,
          isActive: aisleForm.isActive,
          notes: aisleForm.notes || undefined,
        };
        await createAisleMutation.mutateAsync(dto);
        toast.success("Aisle created.");
      } else {
        const dto: UpdateAisleDto = {
          id: aisleModal.aisle.aisleId,
          name: aisleForm.name,
          code: aisleForm.code,
          sortOrder: aisleForm.sortOrder,
          isActive: aisleForm.isActive,
          notes: aisleForm.notes || undefined,
        };
        await updateAisleMutation.mutateAsync(dto);
        toast.success("Aisle updated.");
      }

      setAisleModal({ open: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save aisle.");
    }
  }

  async function submitBin(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (!binModal.open) return;

      if (binModal.mode === "create") {
        const dto: CreateBinDto = {
          aisleId: binModal.aisle.aisleId,
          name: binForm.name,
          code: binForm.code,
          capacityParcelCount: Number(binForm.capacityParcelCount),
          isActive: binForm.isActive,
          notes: binForm.notes || undefined,
        };
        await createBinMutation.mutateAsync(dto);
        toast.success("Bin created.");
      } else {
        const dto: UpdateBinDto = {
          id: binModal.bin.id,
          name: binForm.name,
          code: binForm.code,
          capacityParcelCount: Number(binForm.capacityParcelCount),
          isActive: binForm.isActive,
          notes: binForm.notes || undefined,
        };
        await updateBinMutation.mutateAsync(dto);
        toast.success("Bin updated.");
      }

      setBinModal({ open: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save bin.");
    }
  }

  async function handleDeleteAisle(aisle: WarehouseAisleDto) {
    if (
      !window.confirm(
        `Delete ${aisle.aisleName}? This only works if none of its bins contain parcels.`,
      )
    ) {
      return;
    }

    try {
      await deleteAisleMutation.mutateAsync(aisle.aisleId);
      toast.success("Aisle deleted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Unable to delete aisle.",
      );
    }
  }

  async function handleDeleteBin(bin: WarehouseBinDto) {
    if (
      !window.confirm(
        `Delete ${bin.name}? This only works if no parcels are assigned.`,
      )
    ) {
      return;
    }

    try {
      await deleteBinMutation.mutateAsync(bin.id);
      toast.success("Bin deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to delete bin.");
    }
  }

  return (
    <>
      <style>{`
        .tm-input:focus { border-color: rgba(245,158,11,.45) !important; box-shadow: 0 0 0 2px rgba(245,158,11,.08); }
        .tm-card:hover { border-color: rgba(245,158,11,.18) !important; }
        .tm-tab.active { color: #f59e0b; border-color: rgba(245,158,11,.35); background: rgba(245,158,11,.08); }
      `}</style>

      <div style={{ minHeight: "100vh", background: S.bg, color: S.text }}>
        <TmNavbar />
        <div style={{ padding: "2rem", maxWidth: 1360, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "1rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: S.mono,
                  fontSize: "10px",
                  letterSpacing: ".2em",
                  color: S.accent,
                  textTransform: "uppercase",
                  marginBottom: ".375rem",
                }}
              >
                Warehouse
              </p>
              <h1
                style={{
                  fontFamily: S.mono,
                  fontSize: "1.5rem",
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Bin Management
              </h1>
            </div>

            {!isWarehouseManager && depots.length > 0 ? (
              <select
                value={selectedDepotId}
                onChange={(event) => setSelectedDepotId(event.target.value)}
                style={{
                  background: S.inputBg,
                  border: `1px solid ${S.inputBorder}`,
                  color: S.text,
                  borderRadius: 6,
                  padding: ".65rem .8rem",
                  minWidth: 260,
                  fontFamily: S.mono,
                }}
              >
                <option value="">All accessible depots</option>
                {depots.map((depot) => (
                  <option key={depot.id} value={depot.id}>
                    {depot.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            {[
              {
                label: "Accessible Depots",
                value: warehouseData.length,
                accent: S.blue,
              },
              { label: "Configured Bins", value: totalBins, accent: S.accent },
              { label: "Active Bins", value: activeBins, accent: S.green },
              {
                label: "Utilization",
                value: `${occupiedCapacity}/${totalCapacity}`,
                accent: S.text,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="tm-card"
                style={{
                  background: S.panel,
                  border: `1px solid ${S.border}`,
                  borderRadius: 10,
                  padding: "1rem 1.1rem",
                }}
              >
                <div
                  style={{
                    fontFamily: S.mono,
                    fontSize: "10px",
                    letterSpacing: ".14em",
                    color: S.muted,
                    textTransform: "uppercase",
                    marginBottom: ".45rem",
                  }}
                >
                  {stat.label}
                </div>
                <div
                  style={{
                    fontFamily: S.mono,
                    fontSize: "1.35rem",
                    fontWeight: 800,
                    color: stat.accent,
                  }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: ".75rem", marginBottom: "1rem" }}>
            <button
              className={`tm-tab ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}
              style={{
                fontFamily: S.mono,
                fontSize: "11px",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                padding: ".6rem .9rem",
                borderRadius: 8,
                border: `1px solid ${S.border}`,
                background: S.panel,
                color: S.text,
                cursor: "pointer",
              }}
            >
              List View
            </button>
            <button
              className={`tm-tab ${tab === "layout" ? "active" : ""}`}
              onClick={() => setTab("layout")}
              style={{
                fontFamily: S.mono,
                fontSize: "11px",
                letterSpacing: ".12em",
                textTransform: "uppercase",
                padding: ".6rem .9rem",
                borderRadius: 8,
                border: `1px solid ${S.border}`,
                background: S.panel,
                color: S.text,
                cursor: "pointer",
              }}
            >
              Layout View
            </button>
          </div>

          {isLoading ? (
            <p style={{ fontFamily: S.mono, color: S.muted }}>
              Loading warehouse bins...
            </p>
          ) : null}
          {error ? (
            <p style={{ fontFamily: S.mono, color: S.red }}>{String(error)}</p>
          ) : null}

          {!isLoading && warehouseData.length === 0 ? (
            <div
              style={{
                background: S.panel,
                border: `1px solid ${S.border}`,
                borderRadius: 10,
                padding: "1.25rem",
                fontFamily: S.mono,
                color: S.muted,
              }}
            >
              No accessible depots or bins found.
            </div>
          ) : null}

          {tab === "list"
            ? warehouseData.map((depot: WarehouseDepotDto) => (
                <div
                  key={depot.depotId}
                  style={{
                    background: S.panel,
                    border: `1px solid ${S.border}`,
                    borderRadius: 12,
                    marginBottom: "1rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      borderBottom: `1px solid ${S.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: S.mono,
                        fontSize: "10px",
                        letterSpacing: ".16em",
                        color: S.muted,
                        textTransform: "uppercase",
                        marginBottom: ".25rem",
                      }}
                    >
                      Depot
                    </div>
                    <div
                      style={{
                        fontFamily: S.mono,
                        fontSize: "1.1rem",
                        fontWeight: 800,
                      }}
                    >
                      {depot.depotName}
                    </div>
                  </div>

                  <div style={{ padding: "1rem" }}>
                    {depot.zones.map((zone) => (
                      <div
                        key={zone.zoneId}
                        style={{
                          border: `1px solid ${S.border}`,
                          borderRadius: 10,
                          marginBottom: "1rem",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "1rem",
                            alignItems: "center",
                            padding: ".9rem 1rem",
                            background: "rgba(255,255,255,.02)",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontFamily: S.mono,
                                fontSize: "10px",
                                letterSpacing: ".14em",
                                color: S.muted,
                                textTransform: "uppercase",
                              }}
                            >
                              Zone
                            </div>
                            <div
                              style={{ fontFamily: S.mono, fontWeight: 700 }}
                            >
                              {zone.zoneName}
                            </div>
                          </div>
                          <TmBtn
                            variant="primary"
                            onClick={() => openCreateAisle(zone)}
                          >
                            + Add Aisle
                          </TmBtn>
                        </div>

                        <div
                          style={{
                            padding: "1rem",
                            display: "grid",
                            gap: "1rem",
                          }}
                        >
                          {zone.aisles.length === 0 ? (
                            <div
                              style={{
                                fontFamily: S.mono,
                                color: S.muted,
                                fontSize: ".9rem",
                              }}
                            >
                              No aisles configured yet.
                            </div>
                          ) : null}

                          {zone.aisles.map((aisle) => (
                            <div
                              key={aisle.aisleId}
                              style={{
                                border: `1px solid ${S.border}`,
                                borderRadius: 10,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: "1rem",
                                  padding: ".85rem 1rem",
                                  borderBottom: `1px solid ${S.border}`,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontFamily: S.mono,
                                      fontSize: "10px",
                                      letterSpacing: ".14em",
                                      color: S.muted,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {aisle.code}
                                  </div>
                                  <div
                                    style={{
                                      fontFamily: S.mono,
                                      fontWeight: 700,
                                    }}
                                  >
                                    {aisle.aisleName}
                                  </div>
                                  <div
                                    style={{
                                      fontFamily: S.mono,
                                      fontSize: "11px",
                                      color: S.muted,
                                      marginTop: ".25rem",
                                    }}
                                  >
                                    Parcels in aisle: {aisle.currentParcelCount}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: ".5rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <TmBtn
                                    variant="ghost"
                                    onClick={() => openEditAisle(zone, aisle)}
                                    disabled={!aisle.canEdit}
                                    title={getAisleActionReason(aisle)}
                                  >
                                    Edit Aisle
                                  </TmBtn>
                                  <TmBtn
                                    variant="danger"
                                    onClick={() => handleDeleteAisle(aisle)}
                                    disabled={!aisle.canDelete}
                                    title={getAisleActionReason(aisle)}
                                  >
                                    Delete Aisle
                                  </TmBtn>
                                  <TmBtn
                                    variant="primary"
                                    onClick={() => openCreateBin(aisle)}
                                  >
                                    + Add Bin
                                  </TmBtn>
                                </div>
                              </div>

                              <div
                                style={{
                                  padding: "1rem",
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit,minmax(240px,1fr))",
                                  gap: "1rem",
                                }}
                              >
                                {aisle.bins.map((bin) => (
                                  <div
                                    key={bin.id}
                                    className="tm-card"
                                    style={{
                                      background: "rgba(255,255,255,.02)",
                                      border: `1px solid ${S.border}`,
                                      borderRadius: 10,
                                      padding: "1rem",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                        gap: ".75rem",
                                        marginBottom: ".5rem",
                                      }}
                                    >
                                      <div>
                                        <div
                                          style={{
                                            fontFamily: S.mono,
                                            fontSize: "10px",
                                            letterSpacing: ".14em",
                                            color: S.muted,
                                            textTransform: "uppercase",
                                          }}
                                        >
                                          {bin.code}
                                        </div>
                                        <div
                                          style={{
                                            fontFamily: S.mono,
                                            fontSize: "1rem",
                                            fontWeight: 700,
                                          }}
                                        >
                                          {bin.name}
                                        </div>
                                      </div>
                                      <span
                                        style={{
                                          fontFamily: S.mono,
                                          fontSize: "10px",
                                          letterSpacing: ".12em",
                                          textTransform: "uppercase",
                                          color: bin.isActive ? S.green : S.red,
                                        }}
                                      >
                                        {bin.isActive ? "Active" : "Inactive"}
                                      </span>
                                    </div>

                                    <div
                                      style={{
                                        fontFamily: S.mono,
                                        fontSize: "11px",
                                        color: S.muted,
                                        marginBottom: ".5rem",
                                      }}
                                    >
                                      Utilization: {bin.currentParcelCount}/
                                      {bin.capacityParcelCount} (
                                      {bin.utilizationPercent}%)
                                    </div>
                                    <div
                                      style={{
                                        height: 8,
                                        background: "rgba(255,255,255,.05)",
                                        borderRadius: 999,
                                        overflow: "hidden",
                                        marginBottom: ".9rem",
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${Math.min(bin.utilizationPercent, 100)}%`,
                                          background:
                                            bin.utilizationPercent > 85
                                              ? S.red
                                              : S.accent,
                                          height: "100%",
                                        }}
                                      />
                                    </div>

                                    <div
                                      style={{
                                        display: "flex",
                                        gap: ".5rem",
                                        flexWrap: "wrap",
                                      }}
                                    >
                                      <TmBtn
                                        variant="ghost"
                                        onClick={() => openEditBin(aisle, bin)}
                                        disabled={!bin.canEdit}
                                        title={getBinActionReason(bin)}
                                      >
                                        Edit
                                      </TmBtn>
                                      <TmBtn
                                        variant="danger"
                                        onClick={() => handleDeleteBin(bin)}
                                        disabled={!bin.canDelete}
                                        title={getBinActionReason(bin)}
                                      >
                                        Delete
                                      </TmBtn>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            : warehouseData.map((depot) => (
                <div
                  key={depot.depotId}
                  style={{
                    background: S.panel,
                    border: `1px solid ${S.border}`,
                    borderRadius: 12,
                    marginBottom: "1rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      borderBottom: `1px solid ${S.border}`,
                      fontFamily: S.mono,
                      fontWeight: 800,
                    }}
                  >
                    {depot.depotName}
                  </div>
                  <div
                    style={{ padding: "1rem", display: "grid", gap: "1rem" }}
                  >
                    {depot.zones.map((zone) => (
                      <div
                        key={zone.zoneId}
                        style={{
                          border: `1px solid ${S.border}`,
                          borderRadius: 10,
                          padding: "1rem",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: S.mono,
                            fontSize: "10px",
                            color: S.muted,
                            letterSpacing: ".14em",
                            textTransform: "uppercase",
                            marginBottom: ".6rem",
                          }}
                        >
                          {zone.zoneName}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit,minmax(220px,1fr))",
                            gap: "1rem",
                          }}
                        >
                          {zone.aisles.map((aisle) => (
                            <div
                              key={aisle.aisleId}
                              style={{
                                background: "rgba(255,255,255,.02)",
                                border: `1px solid ${S.border}`,
                                borderRadius: 10,
                                padding: ".85rem",
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: S.mono,
                                  fontSize: "11px",
                                  letterSpacing: ".1em",
                                  color: S.accent,
                                  textTransform: "uppercase",
                                  marginBottom: ".6rem",
                                }}
                              >
                                {aisle.code}
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(2, minmax(0,1fr))",
                                  gap: ".5rem",
                                }}
                              >
                                {aisle.bins.map((bin) => (
                                  <div
                                    key={bin.id}
                                    style={{
                                      border: `1px solid ${S.border}`,
                                      borderRadius: 8,
                                      padding: ".55rem",
                                      background:
                                        bin.currentParcelCount > 0
                                          ? "rgba(245,158,11,.08)"
                                          : "rgba(255,255,255,.03)",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontFamily: S.mono,
                                        fontSize: "11px",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {bin.code}
                                    </div>
                                    <div
                                      style={{
                                        fontFamily: S.mono,
                                        fontSize: "10px",
                                        color: S.muted,
                                      }}
                                    >
                                      {bin.currentParcelCount}/
                                      {bin.capacityParcelCount}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
        </div>
      </div>

      {aisleModal.open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#0d1424",
              border: `1px solid ${S.border}`,
              borderRadius: 14,
              padding: "1.5rem",
              width: "100%",
              maxWidth: 520,
            }}
          >
            <form onSubmit={submitAisle}>
              <h2 style={{ fontFamily: S.mono, marginTop: 0 }}>
                {aisleModal.mode === "create" ? "Create Aisle" : "Edit Aisle"}
              </h2>
              <div style={{ marginBottom: ".9rem" }}>
                <TmLabel htmlFor="aisle-name">Name</TmLabel>
                <input
                  id="aisle-name"
                  value={aisleForm.name}
                  onChange={(e) =>
                    setAisleForm((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
                  }
                  required
                  className="tm-input"
                  style={{
                    width: "100%",
                    background: S.inputBg,
                    border: `1px solid ${S.inputBorder}`,
                    borderRadius: 6,
                    color: S.text,
                    padding: ".65rem .8rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: ".9rem",
                  marginBottom: ".9rem",
                }}
              >
                <div>
                  <TmLabel htmlFor="aisle-code">Code</TmLabel>
                  <input
                    id="aisle-code"
                    value={aisleForm.code}
                    onChange={(e) =>
                      setAisleForm((current) => ({
                        ...current,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="tm-input"
                    placeholder={
                      aisleModal.mode === "create"
                        ? "Leave blank to auto-generate"
                        : undefined
                    }
                    style={{
                      width: "100%",
                      background: S.inputBg,
                      border: `1px solid ${S.inputBorder}`,
                      borderRadius: 6,
                      color: S.text,
                      padding: ".65rem .8rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <TmLabel htmlFor="aisle-sort">Sort Order</TmLabel>
                  <input
                    id="aisle-sort"
                    type="number"
                    min={1}
                    value={aisleForm.sortOrder}
                    onChange={(e) =>
                      setAisleForm((current) => ({
                        ...current,
                        sortOrder: Number(e.target.value),
                      }))
                    }
                    required
                    className="tm-input"
                    style={{
                      width: "100%",
                      background: S.inputBg,
                      border: `1px solid ${S.inputBorder}`,
                      borderRadius: 6,
                      color: S.text,
                      padding: ".65rem .8rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: ".9rem" }}>
                <TmLabel htmlFor="aisle-notes">Notes</TmLabel>
                <textarea
                  id="aisle-notes"
                  value={aisleForm.notes}
                  onChange={(e) =>
                    setAisleForm((current) => ({
                      ...current,
                      notes: e.target.value,
                    }))
                  }
                  className="tm-input"
                  style={{
                    width: "100%",
                    minHeight: 90,
                    background: S.inputBg,
                    border: `1px solid ${S.inputBorder}`,
                    borderRadius: 6,
                    color: S.text,
                    padding: ".65rem .8rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <label
                style={{
                  display: "flex",
                  gap: ".5rem",
                  alignItems: "center",
                  fontFamily: S.mono,
                  fontSize: "11px",
                  color: S.muted,
                  marginBottom: "1rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={aisleForm.isActive}
                  onChange={(e) =>
                    setAisleForm((current) => ({
                      ...current,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Active
              </label>
              <div
                style={{
                  display: "flex",
                  gap: ".75rem",
                  justifyContent: "flex-end",
                }}
              >
                <TmBtn
                  variant="ghost"
                  onClick={() => setAisleModal({ open: false })}
                >
                  Cancel
                </TmBtn>
                <TmBtn
                  type="submit"
                  variant="primary"
                  disabled={
                    createAisleMutation.isPending ||
                    updateAisleMutation.isPending
                  }
                >
                  Save Aisle
                </TmBtn>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {binModal.open ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#0d1424",
              border: `1px solid ${S.border}`,
              borderRadius: 14,
              padding: "1.5rem",
              width: "100%",
              maxWidth: 560,
            }}
          >
            <form onSubmit={submitBin}>
              <h2 style={{ fontFamily: S.mono, marginTop: 0 }}>
                {binModal.mode === "create" ? "Create Bin" : "Edit Bin"}
              </h2>
              <div style={{ marginBottom: ".9rem" }}>
                <TmLabel htmlFor="bin-name">Name</TmLabel>
                <input
                  id="bin-name"
                  value={binForm.name}
                  onChange={(e) =>
                    setBinForm((current) => ({
                      ...current,
                      name: e.target.value,
                    }))
                  }
                  required
                  className="tm-input"
                  style={{
                    width: "100%",
                    background: S.inputBg,
                    border: `1px solid ${S.inputBorder}`,
                    borderRadius: 6,
                    color: S.text,
                    padding: ".65rem .8rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: ".9rem",
                  marginBottom: ".9rem",
                }}
              >
                <div>
                  <TmLabel htmlFor="bin-code">Code</TmLabel>
                  <input
                    id="bin-code"
                    value={binForm.code}
                    onChange={(e) =>
                      setBinForm((current) => ({
                        ...current,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className="tm-input"
                    placeholder={
                      binModal.mode === "create"
                        ? "Leave blank to auto-generate"
                        : undefined
                    }
                    style={{
                      width: "100%",
                      background: S.inputBg,
                      border: `1px solid ${S.inputBorder}`,
                      borderRadius: 6,
                      color: S.text,
                      padding: ".65rem .8rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div>
                  <TmLabel htmlFor="bin-capacity">Capacity</TmLabel>
                  <input
                    id="bin-capacity"
                    type="number"
                    min={1}
                    value={binForm.capacityParcelCount}
                    onChange={(e) =>
                      setBinForm((current) => ({
                        ...current,
                        capacityParcelCount: Number(e.target.value),
                      }))
                    }
                    required
                    className="tm-input"
                    style={{
                      width: "100%",
                      background: S.inputBg,
                      border: `1px solid ${S.inputBorder}`,
                      borderRadius: 6,
                      color: S.text,
                      padding: ".65rem .8rem",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: ".9rem" }}>
                <TmLabel htmlFor="bin-notes">Notes</TmLabel>
                <textarea
                  id="bin-notes"
                  value={binForm.notes}
                  onChange={(e) =>
                    setBinForm((current) => ({
                      ...current,
                      notes: e.target.value,
                    }))
                  }
                  className="tm-input"
                  style={{
                    width: "100%",
                    minHeight: 90,
                    background: S.inputBg,
                    border: `1px solid ${S.inputBorder}`,
                    borderRadius: 6,
                    color: S.text,
                    padding: ".65rem .8rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <label
                style={{
                  display: "flex",
                  gap: ".5rem",
                  alignItems: "center",
                  fontFamily: S.mono,
                  fontSize: "11px",
                  color: S.muted,
                  marginBottom: "1rem",
                }}
              >
                <input
                  type="checkbox"
                  checked={binForm.isActive}
                  onChange={(e) =>
                    setBinForm((current) => ({
                      ...current,
                      isActive: e.target.checked,
                    }))
                  }
                />
                Active
              </label>
              <div
                style={{
                  display: "flex",
                  gap: ".75rem",
                  justifyContent: "flex-end",
                }}
              >
                <TmBtn
                  variant="ghost"
                  onClick={() => setBinModal({ open: false })}
                >
                  Cancel
                </TmBtn>
                <TmBtn
                  type="submit"
                  variant="primary"
                  disabled={
                    createBinMutation.isPending || updateBinMutation.isPending
                  }
                >
                  Save Bin
                </TmBtn>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
