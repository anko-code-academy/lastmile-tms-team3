import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ParcelTable } from "@/components/parcels/ParcelTable";
import { ParcelStatus, ServiceType, WeightUnit } from "@/lib/types/parcel";
import type { ParcelListItem } from "@/lib/types/parcel";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function createMockParcel(
  overrides: Partial<ParcelListItem> = {},
): ParcelListItem {
  return {
    id: "parcel-1",
    trackingNumber: "TRK001",
    serviceType: ServiceType.Standard,
    status: ParcelStatus.Registered,
    recipientName: "John Doe",
    recipientCity: "New York",
    weight: 5,
    weightUnit: WeightUnit.Kg,
    declaredValue: 100,
    currency: "USD",
    contentItemsCount: 2,
    createdAt: "2024-01-15T00:00:00Z",
    ...overrides,
  };
}

describe("ParcelTable", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("row click navigation", () => {
    it("navigates to parcel detail page when row is clicked", () => {
      const parcels = [
        createMockParcel({ id: "parcel-123", trackingNumber: "TRK001" }),
      ];
      render(
        <ParcelTable
          items={parcels}
          sortField={null}
          sortDir="asc"
          onSort={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("TRK001"));

      expect(mockPush).toHaveBeenCalledWith("/parcels/parcel-123");
    });

    it("navigates with correct id for multiple parcels", () => {
      const parcels = [
        createMockParcel({ id: "parcel-a", trackingNumber: "TRKAAA" }),
        createMockParcel({ id: "parcel-b", trackingNumber: "TRKBBB" }),
      ];
      render(
        <ParcelTable
          items={parcels}
          sortField={null}
          sortDir="asc"
          onSort={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByText("TRKAAA"));
      expect(mockPush).toHaveBeenCalledWith("/parcels/parcel-a");

      fireEvent.click(screen.getByText("TRKBBB"));
      expect(mockPush).toHaveBeenCalledWith("/parcels/parcel-b");
    });
  });

  describe("column header sorting", () => {
    it("calls onSort with trackingNumber when that header is clicked", () => {
      const parcels = [createMockParcel()];
      const onSort = vi.fn();
      render(
        <ParcelTable
          items={parcels}
          sortField={null}
          sortDir="asc"
          onSort={onSort}
        />,
      );

      fireEvent.click(screen.getByText("Tracking number"));

      expect(onSort).toHaveBeenCalledWith("trackingNumber");
    });

    it("does not call onSort when a non-sortable header is clicked", () => {
      const parcels = [createMockParcel()];
      const onSort = vi.fn();
      render(
        <ParcelTable
          items={parcels}
          sortField={null}
          sortDir="asc"
          onSort={onSort}
        />,
      );

      fireEvent.click(screen.getByText("Recipient"));

      expect(onSort).not.toHaveBeenCalled();
    });

    it("calls onSort with createdAt when that header is clicked", () => {
      const parcels = [createMockParcel()];
      const onSort = vi.fn();
      render(
        <ParcelTable
          items={parcels}
          sortField={null}
          sortDir="asc"
          onSort={onSort}
        />,
      );

      fireEvent.click(screen.getByText("Created"));

      expect(onSort).toHaveBeenCalledWith("createdAt");
    });

    it("calls onSort only for server-sortable headers", () => {
      const parcels = [createMockParcel()];
      const onSort = vi.fn();
      render(
        <ParcelTable
          items={parcels}
          sortField={null}
          sortDir="asc"
          onSort={onSort}
        />,
      );

      const sortableHeaders = ["Tracking number", "Status", "Created"];

      for (const header of sortableHeaders) {
        onSort.mockClear();
        fireEvent.click(screen.getByText(header));
        expect(onSort).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe("empty state", () => {
    it("renders No parcels found when items array is empty", () => {
      render(
        <ParcelTable
          items={[]}
          sortField={null}
          sortDir="asc"
          onSort={vi.fn()}
        />,
      );

      expect(screen.getByText("No parcels found.")).toBeInTheDocument();
    });

    it("renders empty state with correct colSpan of 9", () => {
      render(
        <ParcelTable
          items={[]}
          sortField={null}
          sortDir="asc"
          onSort={vi.fn()}
        />,
      );

      const cell = screen.getByRole("cell", { name: "No parcels found." });
      expect(cell).toHaveAttribute("colSpan", "9");
    });
  });

  describe("sort indicator", () => {
    it("shows sort indicator when a column is actively sorted", () => {
      const parcels = [createMockParcel()];
      render(
        <ParcelTable
          items={parcels}
          sortField="trackingNumber"
          sortDir="asc"
          onSort={vi.fn()}
        />,
      );

      // The sort icon (↑) should appear next to Tracking number column
      expect(screen.getByText("↑")).toBeInTheDocument();
    });

    it("shows ↓ when sort direction is descending", () => {
      const parcels = [createMockParcel()];
      render(
        <ParcelTable
          items={parcels}
          sortField="trackingNumber"
          sortDir="desc"
          onSort={vi.fn()}
        />,
      );

      expect(screen.getByText("↓")).toBeInTheDocument();
    });

    it("does not show sort indicator for non-active columns", () => {
      const parcels = [createMockParcel()];
      render(
        <ParcelTable
          items={parcels}
          sortField="trackingNumber"
          sortDir="asc"
          onSort={vi.fn()}
        />,
      );

      // Should not have a sort indicator on Recipient column
      const recipientSortIcons = screen.getAllByText(
        (content) => content === "↑",
      );
      expect(recipientSortIcons).toHaveLength(1);
    });
  });
});
