"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import TmNavbar from "@/components/TmNavbar";
import {
  useCreateAisle,
  useCreateBin,
  useDeleteAisle,
  useDeleteBin,
  useFindBinByTrackingNumber,
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
  muted: "#647a96" as const,
  dim: "#4e6480" as const,
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

function SectionToggleButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={expanded}
      aria-label={expanded ? "Collapse section" : "Expand section"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        padding: 0,
        borderRadius: 999,
        cursor: "pointer",
        border: expanded
          ? `1px solid ${S.border}`
          : "1px solid rgba(245,158,11,.3)",
        background: expanded ? "transparent" : "rgba(245,158,11,.08)",
        color: expanded ? S.muted : S.accent,
        transition:
          "transform .18s ease, background .18s ease, color .18s ease",
      }}
    >
      <ChevronDown
        size={20}
        style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
      />
    </button>
  );
}

function ActiveInactiveToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (nextValue: boolean) => void;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <TmLabel>Status</TmLabel>
      <div style={{ display: "flex", gap: ".5rem" }}>
        {[
          { label: "Active", nextValue: true, color: S.green },
          { label: "Inactive", nextValue: false, color: S.red },
        ].map(({ label, nextValue, color }) => {
          const selected = value === nextValue;
          const selectedBorder = nextValue
            ? "rgba(34,197,94,.4)"
            : "rgba(239,68,68,.4)";

          return (
            <button
              key={label}
              type="button"
              disabled={selected}
              onClick={() => onChange(nextValue)}
              style={{
                fontFamily: S.mono,
                fontSize: "11px",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                padding: ".45rem .95rem",
                borderRadius: 6,
                cursor: selected ? "default" : "pointer",
                border: `1px solid ${selected ? selectedBorder : S.border}`,
                background: selected
                  ? nextValue
                    ? "rgba(34,197,94,.1)"
                    : "rgba(239,68,68,.08)"
                  : "transparent",
                color: selected ? color : S.muted,
                opacity: selected ? 1 : 0.9,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
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

type WarehouseSummary = {
  depotCount: number;
  zoneCount: number;
  aisleCount: number;
  totalBins: number;
  activeBins: number;
  inactiveBins: number;
  totalParcels: number;
  usedCapacity: number;
  totalCapacity: number;
  utilizationPercent: number;
};

type SummaryStat = {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
};

function formatUtilizationPercent(value: number) {
  return value.toFixed(2);
}

function SummaryCard({
  title,
  summary,
  compact = false,
}: {
  title: string;
  summary: WarehouseSummary;
  compact?: boolean;
}) {
  const sharedStats: SummaryStat[] = [
    { label: "Zones", value: <>{summary.zoneCount}</> },
    { label: "Aisles", value: <>{summary.aisleCount}</> },
    {
      label: "Bins",
      value: (
        <>
          <span>{summary.totalBins}</span>
          <span style={{ color: S.muted }}>(</span>
          <span style={{ color: S.green }}>{summary.activeBins}</span>
          <span style={{ color: S.muted }}>/</span>
          <span style={{ color: S.red }}>{summary.inactiveBins}</span>
          <span style={{ color: S.muted }}>)</span>
        </>
      ),
    },
    {
      label: "Utilization",
      value: (
        <>
          {summary.usedCapacity}/{summary.totalCapacity}
          <span style={{ color: S.muted }}> </span>
          <span style={{ color: S.muted }}>
            ({formatUtilizationPercent(summary.utilizationPercent)}%)
          </span>
        </>
      ),
    },
  ];

  const compactStats: SummaryStat[] = [
    { label: "Depots", value: <>{summary.depotCount}</> },
    ...sharedStats,
  ];

  if (compact) {
    return (
      <div
        className="tm-card"
        style={{
          background: S.panel,
          border: `1px solid ${S.border}`,
          borderRadius: 12,
          padding: ".85rem 1rem",
        }}
      >
        <div
          style={{
            fontFamily: S.mono,
            fontSize: "10px",
            letterSpacing: ".16em",
            color: S.muted,
            textTransform: "uppercase",
            marginBottom: ".8rem",
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: ".85rem 1.25rem",
            alignItems: "flex-start",
            justifyContent: "flex-start",
          }}
        >
          {compactStats.map((item) => (
            <div
              key={item.label}
              style={{
                minWidth: 110,
                display: "grid",
                gap: ".15rem",
              }}
            >
              <div
                style={{
                  fontFamily: S.mono,
                  fontSize: "10px",
                  letterSpacing: ".12em",
                  color: S.muted,
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: ".2rem",
                  alignItems: "baseline",
                  flexWrap: "wrap",
                  fontFamily: S.mono,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: S.text,
                }}
              >
                {item.value}
              </div>
              {item.detail ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: ".45rem",
                    fontFamily: S.mono,
                    fontSize: "10px",
                    color: S.muted,
                  }}
                >
                  {item.detail}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="tm-card"
      style={{
        background: S.panel,
        border: `1px solid ${S.border}`,
        borderRadius: 12,
        padding: ".9rem 1rem",
      }}
    >
      <div
        style={{
          fontFamily: S.mono,
          fontSize: "10px",
          letterSpacing: ".16em",
          color: S.muted,
          textTransform: "uppercase",
          marginBottom: ".75rem",
        }}
      >
        {title}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: ".7rem .9rem",
        }}
      >
        {sharedStats.map((item) => (
          <div key={item.label}>
            <div
              style={{
                fontFamily: S.mono,
                fontSize: "10px",
                letterSpacing: ".12em",
                color: S.muted,
                textTransform: "uppercase",
                marginBottom: ".25rem",
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                display: "flex",
                gap: ".2rem",
                alignItems: "baseline",
                flexWrap: "wrap",
                fontFamily: S.mono,
                fontWeight: 700,
                color: S.text,
              }}
            >
              {item.value}
            </div>
            {item.detail ? (
              <div
                style={{
                  marginTop: ".2rem",
                  fontFamily: S.mono,
                  fontSize: "10px",
                  color: S.muted,
                }}
              >
                {item.detail}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function summarizeWarehouse(depots: WarehouseDepotDto[]): WarehouseSummary {
  let zoneCount = 0;
  let aisleCount = 0;
  let totalBins = 0;
  let activeBins = 0;
  let totalParcels = 0;
  let usedCapacity = 0;
  let totalCapacity = 0;

  for (const depot of depots) {
    for (const zone of depot.zones) {
      zoneCount += 1;
      aisleCount += zone.aisles.length;

      for (const aisle of zone.aisles) {
        totalBins += aisle.bins.length;

        for (const bin of aisle.bins) {
          if (bin.isActive) {
            activeBins += 1;
          }

          totalParcels += bin.currentParcelCount;
          usedCapacity += bin.currentParcelCount;
          totalCapacity += bin.capacityParcelCount;
        }
      }
    }
  }

  return {
    depotCount: depots.length,
    zoneCount,
    aisleCount,
    totalBins,
    activeBins,
    inactiveBins: Math.max(totalBins - activeBins, 0),
    totalParcels,
    usedCapacity,
    totalCapacity,
    utilizationPercent:
      totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0,
  };
}

export default function WarehousePage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isWarehouseManager = role === "WarehouseManager";

  const [selectedDepotId, setSelectedDepotId] = useState<string>("");
  const [tab, setTab] = useState<Tab>("list");
  const [expandedDepots, setExpandedDepots] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedZones, setExpandedZones] = useState<Record<string, boolean>>(
    {},
  );
  const [aisleModal, setAisleModal] = useState<AisleModalState>({
    open: false,
  });
  const [binModal, setBinModal] = useState<BinModalState>({ open: false });
  const [searchTrackingNumber, setSearchTrackingNumber] = useState("");
  const [highlightedBinId, setHighlightedBinId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const findBinMutation = useFindBinByTrackingNumber();

  const { data, isLoading, error } = useWarehouseBins();
  const createAisleMutation = useCreateAisle();
  const updateAisleMutation = useUpdateAisle();
  const createBinMutation = useCreateBin();
  const updateBinMutation = useUpdateBin();
  const deleteAisleMutation = useDeleteAisle();
  const deleteBinMutation = useDeleteBin();

  const [aisleForm, setAisleForm] = useState({
    name: "",
    code: "",
    sortOrder: 1,
    isActive: true,
    notes: "",
  });

  const [binForm, setBinForm] = useState({
    name: "",
    code: "",
    capacityParcelCount: 20,
    isActive: true,
    notes: "",
  });

  const warehouseData = data ?? [];
  const filteredWarehouseData =
    !isWarehouseManager && selectedDepotId
      ? warehouseData.filter((depot) => depot.depotId === selectedDepotId)
      : warehouseData;
  const totalSummary = summarizeWarehouse(warehouseData);
  const depotSummaries = warehouseData.map((depot) => ({
    depot,
    summary: summarizeWarehouse([depot]),
  }));
  const warehouseManagerSummary = summarizeWarehouse(filteredWarehouseData);
  const selectedDepotName =
    warehouseData.find((depot) => depot.depotId === selectedDepotId)
      ?.depotName ?? null;

  function getNextAisleSortOrder(zone: WarehouseZoneDto) {
    return (
      zone.aisles.reduce(
        (highestSortOrder, aisle) =>
          Math.max(highestSortOrder, aisle.sortOrder),
        0,
      ) + 1
    );
  }

  function isDepotExpanded(depotId: string) {
    return expandedDepots[depotId] ?? true;
  }

  function isZoneExpanded(zoneId: string) {
    return expandedZones[zoneId] ?? true;
  }

  function toggleDepot(depotId: string) {
    setExpandedDepots((current) => ({
      ...current,
      [depotId]: !(current[depotId] ?? true),
    }));
  }

  function toggleZone(zoneId: string) {
    setExpandedZones((current) => ({
      ...current,
      [zoneId]: !(current[zoneId] ?? true),
    }));
  }

  function openCreateAisle(zone: WarehouseZoneDto) {
    setAisleModal({ open: true, mode: "create", zone });
    setAisleForm({
      name: "",
      code: "",
      sortOrder: getNextAisleSortOrder(zone),
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
      notes: aisle.notes ?? "",
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

  async function handleSearchBin(e: React.FormEvent) {
    e.preventDefault();
    const trackingNumber = searchTrackingNumber.trim();
    if (!trackingNumber) return;

    setHighlightedBinId(null);
    setSearchError(null);

    try {
      const result = await findBinMutation.mutateAsync({
        trackingNumber,
        depotId: selectedDepotId || undefined,
      });

      if (!result.bin) {
        if (result.notFoundReason === "NOT_IN_BIN") {
          setSearchError("Parcel found but not assigned to a bin.");
        } else {
          setSearchError("No parcel found with that tracking number.");
        }
        return;
      }

      // Expand the depot, zone, and aisle containing the bin
      setExpandedDepots((prev) => ({ ...prev, [result.bin!.aisle.zone.depot.id]: true }));
      setExpandedZones((prev) => ({ ...prev, [result.bin!.aisle.zone.id]: true }));
      setHighlightedBinId(result.bin.id);

      // Scroll after React re-renders the expanded sections
      requestAnimationFrame(() => {
        const el = document.getElementById(`bin-${result.bin!.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    } catch {
      setSearchError("Search failed. Please try again.");
    }
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
          isActive: aisleForm.isActive,
          notes: aisleForm.notes || undefined,
        };
        await createAisleMutation.mutateAsync(dto);
        toast.success("Aisle created.");
      } else {
        const dto: UpdateAisleDto = {
          id: aisleModal.aisle.aisleId,
          name: aisleForm.name,
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
        .wh-select { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); color: #e2e8f0; border-radius: 8px; padding: .5rem .75rem; min-width: 260px; font-size: .875rem; outline: none; font-family: var(--font-geist-mono,monospace); }
        .wh-select:focus { border-color: rgba(245,158,11,.45); }
        .wh-select option { background: #0f1929; color: #e2e8f0; }
			`}</style>

      <div style={{ minHeight: "100vh", background: S.bg, color: S.text, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "fixed", inset: 0, zIndex: 0, backgroundImage: "linear-gradient(rgba(30,42,66,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(30,42,66,.45) 1px,transparent 1px)", backgroundSize: "52px 52px", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
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
                Warehouse Overview
              </h1>
              <p
                style={{
                  margin: ".55rem 0 0",
                  fontFamily: S.mono,
                  fontSize: "11px",
                  letterSpacing: ".06em",
                  color: S.muted,
                }}
              >
                {isWarehouseManager
                  ? "Your depot totals and current warehouse layout."
                  : selectedDepotName
                    ? `System totals above. Showing ${selectedDepotName} below.`
                    : "System totals above. Depot breakdowns shown below."}
              </p>
            </div>
          </div>

          {isWarehouseManager ? (
            <div style={{ marginBottom: "1.25rem" }}>
              <SummaryCard
                title={filteredWarehouseData[0]?.depotName ?? "Assigned Depot"}
                summary={warehouseManagerSummary}
              />
            </div>
          ) : (
            <div style={{ marginBottom: "1.25rem" }}>
              <SummaryCard
                title="System Total"
                summary={totalSummary}
                compact
              />
            </div>
          )}

          {!isWarehouseManager && depotSummaries.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                gap: ".85rem",
                marginBottom: "1.25rem",
              }}
            >
              {depotSummaries.map(({ depot, summary }) => (
                <SummaryCard
                  key={depot.depotId}
                  title={depot.depotName}
                  summary={summary}
                />
              ))}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: ".75rem",
              marginTop: ".9rem",
              marginBottom: "1rem",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
              <button
                onClick={() => setTab("list")}
                aria-pressed={tab === "list"}
                style={{
                  fontFamily: S.mono,
                  fontSize: "11px",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  padding: ".6rem .9rem",
                  borderRadius: 8,
                  border:
                    tab === "list"
                      ? "1px solid rgba(245,158,11,.35)"
                      : `1px solid ${S.border}`,
                  background: tab === "list" ? "rgba(245,158,11,.08)" : S.panel,
                  color: tab === "list" ? S.accent : S.text,
                  cursor: "pointer",
                }}
              >
                List View
              </button>
              <button
                onClick={() => setTab("layout")}
                aria-pressed={tab === "layout"}
                style={{
                  fontFamily: S.mono,
                  fontSize: "11px",
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  padding: ".6rem .9rem",
                  borderRadius: 8,
                  border:
                    tab === "layout"
                      ? "1px solid rgba(245,158,11,.35)"
                      : `1px solid ${S.border}`,
                  background:
                    tab === "layout" ? "rgba(245,158,11,.08)" : S.panel,
                  color: tab === "layout" ? S.accent : S.text,
                  cursor: "pointer",
                }}
              >
                Layout View
              </button>
            </div>

            <div style={{ position: "relative" }}>
              <form
                onSubmit={handleSearchBin}
                style={{
                  display: "flex",
                  gap: ".5rem",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  value={searchTrackingNumber}
                  onChange={(e) => {
                    setSearchTrackingNumber(e.target.value);
                    if (searchError) setSearchError(null);
                    if (highlightedBinId) setHighlightedBinId(null);
                  }}
                  placeholder="Parcel tracking number"
                  className="tm-input"
                  style={{
                    background: S.inputBg,
                    border: `1px solid ${S.inputBorder}`,
                    borderRadius: 6,
                    color: S.text,
                    padding: ".55rem .75rem",
                    width: 200,
                    fontFamily: S.mono,
                    fontSize: "12px",
                  }}
                />
                <TmBtn
                  type="submit"
                  disabled={findBinMutation.isPending || !searchTrackingNumber.trim()}
                >
                  Find Bin
                </TmBtn>
              </form>
              {searchError && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    fontFamily: S.mono,
                    fontSize: "11px",
                    color: S.red,
                    marginTop: ".3rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {searchError}
                </div>
              )}
            </div>

            {!isWarehouseManager ? (
              <div
                style={{
                  display: "flex",
                  gap: ".6rem",
                  alignItems: "center",
                  marginLeft: "auto",
                }}
              >
                <span
                  style={{
                    fontFamily: S.mono,
                    fontSize: "10px",
                    letterSpacing: ".16em",
                    textTransform: "uppercase",
                    color: S.muted,
                  }}
                >
                  Depot Filter
                </span>
                <select
                  value={selectedDepotId}
                  onChange={(event) => setSelectedDepotId(event.target.value)}
                  className="wh-select"
                >
                  <option value="">All accessible depots</option>
                  {warehouseData.map((depot) => (
                    <option key={depot.depotId} value={depot.depotId}>
                      {depot.depotName}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {isLoading ? (
            <p style={{ fontFamily: S.mono, color: S.muted }}>
              Loading warehouse bins...
            </p>
          ) : null}
          {error ? (
            <p style={{ fontFamily: S.mono, color: S.red }}>{String(error)}</p>
          ) : null}

          {!isLoading && filteredWarehouseData.length === 0 ? (
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
              No depots match the current filter.
            </div>
          ) : null}

          {tab === "list"
            ? filteredWarehouseData.map((depot: WarehouseDepotDto) =>
                (() => {
                  const depotExpanded = isDepotExpanded(depot.depotId);

                  return (
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
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                          padding: "1rem 1.25rem",
                          borderBottom: `1px solid ${S.border}`,
                        }}
                      >
                        <div>
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
                        <SectionToggleButton
                          expanded={depotExpanded}
                          onClick={() => toggleDepot(depot.depotId)}
                        />
                      </div>

                      {depotExpanded ? (
                        <div style={{ padding: "1rem" }}>
                          {depot.zones.map((zone) =>
                            (() => {
                              const zoneExpanded = isZoneExpanded(zone.zoneId);

                              return (
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
                                        style={{
                                          fontFamily: S.mono,
                                          fontWeight: 700,
                                        }}
                                      >
                                        {zone.zoneName}
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
                                        variant="primary"
                                        onClick={() => openCreateAisle(zone)}
                                      >
                                        + Add Aisle
                                      </TmBtn>
                                      <SectionToggleButton
                                        expanded={zoneExpanded}
                                        onClick={() => toggleZone(zone.zoneId)}
                                      />
                                    </div>
                                  </div>

                                  {zoneExpanded ? (
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
                                                {aisle.bins.length} bins •{" "}
                                                {
                                                  aisle.bins.filter(
                                                    (bin) => bin.isActive,
                                                  ).length
                                                }{" "}
                                                active •{" "}
                                                {
                                                  aisle.bins.filter(
                                                    (bin) => !bin.isActive,
                                                  ).length
                                                }{" "}
                                                inactive •{" "}
                                                {aisle.currentParcelCount}{" "}
                                                parcels
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
                                                onClick={() =>
                                                  openEditAisle(zone, aisle)
                                                }
                                                disabled={!aisle.canEdit}
                                                title={getAisleActionReason(
                                                  aisle,
                                                )}
                                              >
                                                Edit Aisle
                                              </TmBtn>
                                              <TmBtn
                                                variant="danger"
                                                onClick={() =>
                                                  handleDeleteAisle(aisle)
                                                }
                                                disabled={!aisle.canDelete}
                                                title={getAisleActionReason(
                                                  aisle,
                                                )}
                                              >
                                                Delete Aisle
                                              </TmBtn>
                                              <TmBtn
                                                variant="primary"
                                                onClick={() =>
                                                  openCreateBin(aisle)
                                                }
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
                                                id={`bin-${bin.id}`}
                                                className="tm-card"
                                                style={{
                                                  background:
                                                    "rgba(255,255,255,.02)",
                                                  border: highlightedBinId === bin.id
                                                    ? "2px solid rgba(245,158,11,.7)"
                                                    : `1px solid ${S.border}`,
                                                  borderRadius: 10,
                                                  padding: "1rem",
                                                  transition: "border-color .3s ease, box-shadow .3s ease",
                                                  boxShadow: highlightedBinId === bin.id
                                                    ? "0 0 12px rgba(245,158,11,.2)"
                                                    : "none",
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
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
                                                        textTransform:
                                                          "uppercase",
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
                                                      textTransform:
                                                        "uppercase",
                                                      color: bin.isActive
                                                        ? S.green
                                                        : S.red,
                                                    }}
                                                  >
                                                    {bin.isActive
                                                      ? "Active"
                                                      : "Inactive"}
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
                                                  Utilization:{" "}
                                                  {bin.currentParcelCount}/
                                                  {bin.capacityParcelCount} (
                                                  {bin.utilizationPercent}%)
                                                </div>
                                                <div
                                                  style={{
                                                    height: 8,
                                                    background:
                                                      "rgba(255,255,255,.05)",
                                                    borderRadius: 999,
                                                    overflow: "hidden",
                                                    marginBottom: ".9rem",
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      width: `${Math.min(bin.utilizationPercent, 100)}%`,
                                                      background:
                                                        bin.utilizationPercent >
                                                        85
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
                                                    onClick={() =>
                                                      openEditBin(aisle, bin)
                                                    }
                                                    disabled={!bin.canEdit}
                                                    title={getBinActionReason(
                                                      bin,
                                                    )}
                                                  >
                                                    Edit
                                                  </TmBtn>
                                                  <TmBtn
                                                    variant="danger"
                                                    onClick={() =>
                                                      handleDeleteBin(bin)
                                                    }
                                                    disabled={!bin.canDelete}
                                                    title={getBinActionReason(
                                                      bin,
                                                    )}
                                                  >
                                                    Delete
                                                  </TmBtn>
                                                </div>
                                                {bin.notes ? (
                                                  <div
                                                    style={{
                                                      marginTop: ".85rem",
                                                      paddingTop: ".75rem",
                                                      borderTop: `1px solid ${S.border}`,
                                                      fontFamily: S.mono,
                                                      fontSize: "10px",
                                                      color: S.muted,
                                                    }}
                                                  >
                                                    {bin.notes}
                                                  </div>
                                                ) : null}
                                              </div>
                                            ))}
                                          </div>
                                          {aisle.notes ? (
                                            <div
                                              style={{
                                                padding: ".8rem 1rem 1rem",
                                                borderTop: `1px solid ${S.border}`,
                                                fontFamily: S.mono,
                                                fontSize: "11px",
                                                color: S.muted,
                                              }}
                                            >
                                              {aisle.notes}
                                            </div>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })(),
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })(),
              )
            : filteredWarehouseData.map((depot) =>
                (() => {
                  const depotExpanded = isDepotExpanded(depot.depotId);

                  return (
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
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "1rem",
                          padding: "1rem 1.25rem",
                          borderBottom: `1px solid ${S.border}`,
                          fontFamily: S.mono,
                          fontWeight: 800,
                        }}
                      >
                        <span>{depot.depotName}</span>
                        <SectionToggleButton
                          expanded={depotExpanded}
                          onClick={() => toggleDepot(depot.depotId)}
                        />
                      </div>
                      {depotExpanded ? (
                        <div
                          style={{
                            padding: "1rem",
                            display: "grid",
                            gap: "1rem",
                          }}
                        >
                          {depot.zones.map((zone) =>
                            (() => {
                              const zoneExpanded = isZoneExpanded(zone.zoneId);

                              return (
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
                                      marginBottom: zoneExpanded ? ".6rem" : 0,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      gap: "1rem",
                                    }}
                                  >
                                    <span>{zone.zoneName}</span>
                                    <SectionToggleButton
                                      expanded={zoneExpanded}
                                      onClick={() => toggleZone(zone.zoneId)}
                                    />
                                  </div>
                                  {zoneExpanded ? (
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
                                          {aisle.notes ? (
                                            <div
                                              style={{
                                                fontFamily: S.mono,
                                                fontSize: "10px",
                                                color: S.muted,
                                                marginBottom: ".6rem",
                                              }}
                                            >
                                              {aisle.notes}
                                            </div>
                                          ) : null}
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
                                                id={`bin-${bin.id}`}
                                                style={{
                                                  border: highlightedBinId === bin.id
                                                    ? "2px solid rgba(245,158,11,.7)"
                                                    : `1px solid ${S.border}`,
                                                  borderRadius: 8,
                                                  padding: ".55rem",
                                                  background:
                                                    bin.currentParcelCount > 0
                                                      ? "rgba(245,158,11,.08)"
                                                      : "rgba(255,255,255,.03)",
                                                  transition: "border-color .3s ease, box-shadow .3s ease",
                                                  boxShadow: highlightedBinId === bin.id
                                                    ? "0 0 12px rgba(245,158,11,.2)"
                                                    : "none",
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
                                                {bin.notes ? (
                                                  <div
                                                    style={{
                                                      marginTop: ".45rem",
                                                      paddingTop: ".45rem",
                                                      borderTop: `1px solid ${S.border}`,
                                                      fontFamily: S.mono,
                                                      fontSize: "9px",
                                                      color: S.muted,
                                                    }}
                                                  >
                                                    {bin.notes}
                                                  </div>
                                                ) : null}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })(),
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })(),
              )}
        </div>
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
              <h2
                style={{
                  fontFamily: S.mono,
                  color: S.accent,
                  marginTop: 0,
                  marginBottom: ".85rem",
                }}
              >
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
                    onChange={
                      aisleModal.mode === "create"
                        ? (e) =>
                            setAisleForm((current) => ({
                              ...current,
                              code: e.target.value.toUpperCase(),
                            }))
                        : undefined
                    }
                    readOnly={aisleModal.mode === "edit"}
                    className="tm-input"
                    placeholder={
                      aisleModal.mode === "create"
                        ? "Leave blank to auto-generate"
                        : undefined
                    }
                    style={{
                      width: "100%",
                      background:
                        aisleModal.mode === "edit" ? S.panel : S.inputBg,
                      border:
                        aisleModal.mode === "edit"
                          ? `1px solid ${S.border}`
                          : `1px solid ${S.inputBorder}`,
                      borderRadius: 6,
                      color: aisleModal.mode === "edit" ? S.muted : S.text,
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
                    readOnly
                    className="tm-input"
                    style={{
                      width: "100%",
                      background: S.panel,
                      border: `1px solid ${S.border}`,
                      borderRadius: 6,
                      color: S.muted,
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
              <ActiveInactiveToggle
                value={aisleForm.isActive}
                onChange={(nextValue) =>
                  setAisleForm((current) => ({
                    ...current,
                    isActive: nextValue,
                  }))
                }
              />
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
              <h2
                style={{
                  fontFamily: S.mono,
                  color: S.accent,
                  marginTop: 0,
                  marginBottom: ".85rem",
                }}
              >
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
                    onChange={
                      binModal.mode === "create"
                        ? (e) =>
                            setBinForm((current) => ({
                              ...current,
                              code: e.target.value.toUpperCase(),
                            }))
                        : undefined
                    }
                    readOnly={binModal.mode === "edit"}
                    className="tm-input"
                    placeholder={
                      binModal.mode === "create"
                        ? "Leave blank to auto-generate"
                        : undefined
                    }
                    style={{
                      width: "100%",
                      background:
                        binModal.mode === "edit" ? S.panel : S.inputBg,
                      border:
                        binModal.mode === "edit"
                          ? `1px solid ${S.border}`
                          : `1px solid ${S.inputBorder}`,
                      borderRadius: 6,
                      color: binModal.mode === "edit" ? S.muted : S.text,
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
                    onChange={
                      binModal.mode === "create"
                        ? (e) =>
                            setBinForm((current) => ({
                              ...current,
                              capacityParcelCount: Number(e.target.value),
                            }))
                        : undefined
                    }
                    readOnly={binModal.mode === "edit"}
                    required
                    className="tm-input"
                    style={{
                      width: "100%",
                      background:
                        binModal.mode === "edit" ? S.panel : S.inputBg,
                      border:
                        binModal.mode === "edit"
                          ? `1px solid ${S.border}`
                          : `1px solid ${S.inputBorder}`,
                      borderRadius: 6,
                      color: binModal.mode === "edit" ? S.muted : S.text,
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
              <ActiveInactiveToggle
                value={binForm.isActive}
                onChange={(nextValue) =>
                  setBinForm((current) => ({
                    ...current,
                    isActive: nextValue,
                  }))
                }
              />
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
