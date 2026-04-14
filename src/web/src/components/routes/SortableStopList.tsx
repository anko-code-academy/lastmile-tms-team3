"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ParcelStatusBadge } from "@/components/parcels/ParcelStatusBadge";

const S = {
  accent: "#f59e0b" as const,
  text: "#e2e8f0" as const,
  muted: "#647a96" as const,
  red: "#ef4444" as const,
  mono: "var(--font-geist-mono, monospace)" as const,
};

interface StopItem {
  parcelId: string;
  stopOrder: number;
  trackingNumber: string;
  address: string;
  status: string;
}

interface SortableStopListProps {
  stops: StopItem[];
  selectedStopId: string | null;
  onStopSelected: (parcelId: string | null) => void;
  onReorder: (newOrder: { parcelId: string; stopOrder: number }[]) => void;
  onRemove: (parcelId: string) => void;
  disabled?: boolean;
}

export default function SortableStopList({
  stops,
  selectedStopId,
  onStopSelected,
  onReorder,
  onRemove,
  disabled = false,
}: SortableStopListProps) {
  const [localStops, setLocalStops] = useState<StopItem[]>(stops);

  // Sync when external stops change (e.g. after optimization)
  if (
    stops.length !== localStops.length ||
    stops.some(
      (s, i) =>
        s.parcelId !== localStops[i]?.parcelId ||
        s.stopOrder !== localStops[i]?.stopOrder
    )
  ) {
    setLocalStops(stops);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setLocalStops((prev) => {
        const oldIndex = prev.findIndex((s) => s.parcelId === active.id);
        const newIndex = prev.findIndex((s) => s.parcelId === over.id);
        const reordered = arrayMove(prev, oldIndex, newIndex);
        // Reassign stop orders
        const newOrder = reordered.map((s, i) => ({
          parcelId: s.parcelId,
          stopOrder: i + 1,
        }));
        onReorder(newOrder);
        return reordered.map((s, i) => ({ ...s, stopOrder: i + 1 }));
      });
    },
    [onReorder]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localStops.map((s) => s.parcelId)}
        strategy={verticalListSortingStrategy}
      >
        {localStops.map((stop) => (
          <SortableStopItem
            key={stop.parcelId}
            stop={stop}
            isSelected={stop.parcelId === selectedStopId}
            onSelect={onStopSelected}
            onRemove={onRemove}
            disabled={disabled}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

interface SortableStopItemProps {
  stop: StopItem;
  isSelected: boolean;
  onSelect: (parcelId: string | null) => void;
  onRemove: (parcelId: string) => void;
  disabled?: boolean;
}

function SortableStopItem({
  stop,
  isSelected,
  onSelect,
  onRemove,
  disabled,
}: SortableStopItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.parcelId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: ".5rem 1rem",
    borderBottom: "1px solid rgba(255,255,255,.07)",
    display: "flex",
    alignItems: "center",
    gap: ".75rem",
    cursor: isDragging ? "grabbing" : "pointer",
    background: isSelected
      ? "rgba(245,158,11,.06)"
      : isDragging
        ? "rgba(255,255,255,.05)"
        : "transparent",
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 0,
    position: "relative" as const,
  };

  return (
    <div ref={setNodeRef} style={style} onClick={() => onSelect(stop.parcelId)}>
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: disabled ? "not-allowed" : "grab",
          color: S.muted,
          fontSize: ".85rem",
          userSelect: "none",
          padding: "0 .25rem",
          opacity: disabled ? 0.3 : 0.6,
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
        role="button"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
          <circle cx="4" cy="2" r="1.5" />
          <circle cx="8" cy="2" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="4" cy="14" r="1.5" />
          <circle cx="8" cy="14" r="1.5" />
        </svg>
      </span>

      {/* Stop number */}
      <span
        style={{
          color: S.accent,
          fontSize: ".75rem",
          fontWeight: 600,
          minWidth: 24,
        }}
      >
        #{stop.stopOrder}
      </span>

      {/* Tracking number */}
      <span style={{ fontFamily: S.mono, fontSize: ".8rem", flex: 1 }}>
        {stop.trackingNumber}
      </span>

      {/* Status */}
      <ParcelStatusBadge status={stop.status as import("@/lib/types/parcel").ParcelStatus} />

      {/* Address */}
      <span style={{ fontSize: ".75rem", color: S.muted, flex: 1 }}>
        {stop.address}
      </span>

      {/* Remove button */}
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(stop.parcelId);
        }}
        disabled={disabled}
        title="Remove parcel from route"
        style={{
          background: "none",
          border: "none",
          color: S.red,
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: ".85rem",
          padding: ".15rem .35rem",
          borderRadius: 3,
          opacity: disabled ? 0.4 : 0.7,
          lineHeight: 1,
          transition: "opacity .15s",
        }}
      >
        &times;
      </button>
    </div>
  );
}
