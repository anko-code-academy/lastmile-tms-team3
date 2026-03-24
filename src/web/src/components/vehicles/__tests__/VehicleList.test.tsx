import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleList } from "@/components/vehicles/VehicleList";
import { VehicleStatus, VehicleType, WeightUnit, Vehicle } from "@/lib/types/vehicle";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function createMockVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: "1",
    registrationPlate: "ABC123",
    type: VehicleType.Van,
    status: VehicleStatus.Available,
    parcelCapacity: 50,
    weightCapacity: 1000,
    weightUnit: WeightUnit.Kg,
    depotId: "depot-1",
    depot: { id: "depot-1", name: "Main Depot", isActive: true, createdAt: "2024-01-01" },
    createdAt: "2024-01-15T00:00:00Z",
    ...overrides,
  };
}

describe("VehicleList", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  describe("rendering", () => {
    it("shows empty state when no vehicles exist", () => {
      render(<VehicleList initialVehicles={[]} />);

      expect(screen.getByText("No vehicles yet. Add one to get started.")).toBeInTheDocument();
    });

    it("shows filtered empty state when search/filter has no results", () => {
      const vehicles = [createMockVehicle({ registrationPlate: "XYZ789" })];
      render(<VehicleList initialVehicles={vehicles} />);

      // Type a search that doesn't match
      const searchInput = screen.getByPlaceholderText("Search by plate...");
      fireEvent.change(searchInput, { target: { value: "NO_MATCH" } });

      expect(screen.getByText("No vehicles match your filters.")).toBeInTheDocument();
    });

    it("renders vehicle rows correctly", () => {
      const vehicles = [
        createMockVehicle({
          id: "1",
          registrationPlate: "ABC123",
          type: VehicleType.Van,
          status: VehicleStatus.Available,
          parcelCapacity: 50,
          weightCapacity: 1000,
          weightUnit: WeightUnit.Kg,
        }),
        createMockVehicle({
          id: "2",
          registrationPlate: "XYZ789",
          type: VehicleType.Car,
          status: VehicleStatus.InUse,
          parcelCapacity: 20,
          weightCapacity: 500,
          weightUnit: WeightUnit.Lb,
        }),
      ];
      render(<VehicleList initialVehicles={vehicles} />);

      expect(screen.getByText("ABC123")).toBeInTheDocument();
      expect(screen.getByText("XYZ789")).toBeInTheDocument();
      expect(screen.getByText("VAN")).toBeInTheDocument();
      expect(screen.getByText("CAR")).toBeInTheDocument();
    });
  });

  describe("search filtering", () => {
    it("filters vehicles by registration plate (case-insensitive)", () => {
      const vehicles = [
        createMockVehicle({ id: "1", registrationPlate: "ABC123" }),
        createMockVehicle({ id: "2", registrationPlate: "XYZ789" }),
      ];
      render(<VehicleList initialVehicles={vehicles} />);

      const searchInput = screen.getByPlaceholderText("Search by plate...");
      fireEvent.change(searchInput, { target: { value: "abc" } });

      expect(screen.getByText("ABC123")).toBeInTheDocument();
      expect(screen.queryByText("XYZ789")).not.toBeInTheDocument();
    });

    it("shows filtered empty state when search has no matches", () => {
      const vehicles = [createMockVehicle({ registrationPlate: "ABC123" })];
      render(<VehicleList initialVehicles={vehicles} />);

      fireEvent.change(screen.getByPlaceholderText("Search by plate..."), {
        target: { value: "xyz" },
      });

      expect(screen.getByText("No vehicles match your filters.")).toBeInTheDocument();
    });
  });

  describe("status filtering", () => {
    it("shows only vehicles with matching status when filter is active", () => {
      const vehicles = [
        createMockVehicle({ id: "1", status: VehicleStatus.Available }),
        createMockVehicle({ id: "2", status: VehicleStatus.InUse }),
        createMockVehicle({ id: "3", status: VehicleStatus.Maintenance }),
      ];
      render(<VehicleList initialVehicles={vehicles} />);

      // Get all filter buttons and click the one for "In Use" (first one after "All")
      const filterButtons = screen.getAllByRole("button", { name: /In Use/i });
      fireEvent.click(filterButtons[0]);

      // Now check that the table shows only In Use vehicles
      expect(screen.queryByRole("cell", { name: /Available/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("cell", { name: /Maintenance/i })).not.toBeInTheDocument();
    });

    it("shows 'All' filter shows all vehicles", () => {
      const vehicles = [
        createMockVehicle({ id: "1", status: VehicleStatus.Available }),
        createMockVehicle({ id: "2", status: VehicleStatus.InUse }),
      ];
      render(<VehicleList initialVehicles={vehicles} />);

      // Apply a filter first - click "Available" filter button
      const availableButtons = screen.getAllByRole("button", { name: /Available/i });
      fireEvent.click(availableButtons[0]);

      // Click "All" to reset
      fireEvent.click(screen.getByRole("button", { name: /All/i }));

      // Both should now be visible
      expect(screen.getByRole("cell", { name: /Available/i })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: /In Use/i })).toBeInTheDocument();
    });
  });

  describe("sorting", () => {
    it("sorts by registration plate ascending by default (after click)", () => {
      const vehicles = [
        createMockVehicle({ id: "1", registrationPlate: "ZZZ" }),
        createMockVehicle({ id: "2", registrationPlate: "AAA" }),
        createMockVehicle({ id: "3", registrationPlate: "MMM" }),
      ];
      render(<VehicleList initialVehicles={vehicles} />);

      fireEvent.click(screen.getByText("Plate"));

      // First row should be AAA
      const rows = screen.getAllByRole("row");
      expect(rows[1]).toHaveTextContent("AAA");
    });

    it("toggles sort direction when clicking same column", () => {
      const vehicles = [createMockVehicle({ registrationPlate: "AAA" })];
      render(<VehicleList initialVehicles={vehicles} />);

      fireEvent.click(screen.getByText("Plate"));
      // First click goes asc, shows up arrow
      expect(screen.getByText("↑")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Plate"));
      // Second click goes desc, shows down arrow
      expect(screen.getByText("↓")).toBeInTheDocument();
    });
  });

  describe("row click navigation", () => {
    it("navigates to vehicle detail page when row is clicked", () => {
      const vehicles = [createMockVehicle({ id: "vehicle-123", registrationPlate: "ABC123" })];
      render(<VehicleList initialVehicles={vehicles} />);

      fireEvent.click(screen.getByText("ABC123"));

      expect(mockPush).toHaveBeenCalledWith("/admin/vehicles/vehicle-123");
    });
  });
});
