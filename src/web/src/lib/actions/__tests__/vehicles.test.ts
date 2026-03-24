import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateVehicleInput, UpdateVehicleInput, Vehicle } from "@/lib/types/vehicle";
import { VehicleType, WeightUnit, VehicleStatus } from "@/lib/types/vehicle";

// Create mock outside - will be set in beforeEach
const mockGqlFetch = vi.fn();

vi.mock("@/lib/graphql/fetch", () => ({
  gqlFetch: (...args: unknown[]) => mockGqlFetch(...args),
}));

// Import after mocking
import {
  getVehiclesAction,
  getVehicleAction,
  createVehicleAction,
  updateVehicleAction,
  setVehicleStatusAction,
} from "@/lib/actions/vehicles";

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

describe("Vehicle Server Actions", () => {
  beforeEach(() => {
    mockGqlFetch.mockReset();
  });

  describe("getVehiclesAction", () => {
    it("returns array of vehicles on success", async () => {
      const mockVehicles = [createMockVehicle(), createMockVehicle({ id: "2" })];
      mockGqlFetch.mockResolvedValue({ vehicles: mockVehicles });

      const result = await getVehiclesAction();

      expect(result).toEqual(mockVehicles);
      expect(mockGqlFetch).toHaveBeenCalledTimes(1);
    });

    it("returns empty array when no vehicles exist", async () => {
      mockGqlFetch.mockResolvedValue({ vehicles: [] });

      const result = await getVehiclesAction();

      expect(result).toEqual([]);
    });
  });

  describe("getVehicleAction", () => {
    it("returns vehicle when found", async () => {
      const mockVehicle = createMockVehicle({ id: "test-id" });
      mockGqlFetch.mockResolvedValue({ vehicle: mockVehicle });

      const result = await getVehicleAction("test-id");

      expect(result).toEqual(mockVehicle);
      expect(mockGqlFetch).toHaveBeenCalledWith(
        expect.anything(),
        { id: "test-id" }
      );
    });

    it("returns null when vehicle not found", async () => {
      mockGqlFetch.mockResolvedValue({ vehicle: null });

      const result = await getVehicleAction("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createVehicleAction", () => {
    it("returns vehicleId on success", async () => {
      const input: CreateVehicleInput = {
        registrationPlate: "NEW123",
        type: VehicleType.Van,
        parcelCapacity: 50,
        weightCapacity: 1000,
        weightUnit: WeightUnit.Kg,
        depotId: "depot-1",
      };
      const createdVehicle = createMockVehicle({ id: "new-vehicle-id", registrationPlate: "NEW123" });
      mockGqlFetch.mockResolvedValue({ createVehicle: createdVehicle });

      const result = await createVehicleAction(input);

      expect(result).toEqual({ vehicleId: "new-vehicle-id" });
      expect(mockGqlFetch).toHaveBeenCalledWith(
        expect.anything(),
        { input }
      );
    });

    it("returns error on failure", async () => {
      mockGqlFetch.mockRejectedValue(new Error("Validation failed"));

      const result = await createVehicleAction({
        registrationPlate: "BAD",
        type: VehicleType.Van,
        parcelCapacity: 50,
        weightCapacity: 1000,
        weightUnit: WeightUnit.Kg,
        depotId: "depot-1",
      });

      expect(result).toEqual({ error: "Validation failed" });
    });

    it("re-throws NEXT_REDIRECT errors", async () => {
      mockGqlFetch.mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(
        createVehicleAction({
          registrationPlate: "REDIRECT",
          type: VehicleType.Van,
          parcelCapacity: 50,
          weightCapacity: 1000,
          weightUnit: WeightUnit.Kg,
          depotId: "depot-1",
        })
      ).rejects.toThrow("NEXT_REDIRECT");
    });
  });

  describe("updateVehicleAction", () => {
    it("returns vehicleId on success", async () => {
      const input: UpdateVehicleInput = {
        registrationPlate: "UPDATED",
        depotId: "depot-1",
      };
      const updatedVehicle = createMockVehicle({ id: "vehicle-1", registrationPlate: "UPDATED" });
      mockGqlFetch.mockResolvedValue({ updateVehicle: updatedVehicle });

      const result = await updateVehicleAction("vehicle-1", input);

      expect(result).toEqual({ vehicleId: "vehicle-1" });
    });

    it("returns error on failure", async () => {
      mockGqlFetch.mockRejectedValue(new Error("Not found"));

      const result = await updateVehicleAction("bad-id", { depotId: "depot-1" });

      expect(result).toEqual({ error: "Not found" });
    });

    it("re-throws NEXT_REDIRECT errors", async () => {
      mockGqlFetch.mockRejectedValue(new Error("NEXT_REDIRECT"));

      await expect(
        updateVehicleAction("vehicle-1", { depotId: "depot-1" })
      ).rejects.toThrow("NEXT_REDIRECT");
    });
  });

  describe("setVehicleStatusAction", () => {
    it("returns empty object on success", async () => {
      mockGqlFetch.mockResolvedValue({
        updateVehicleStatus: { id: "1", status: VehicleStatus.Maintenance, lastModifiedAt: "2024-01-16" },
      });

      const result = await setVehicleStatusAction("1", VehicleStatus.Maintenance);

      expect(result).toEqual({});
    });

    it("returns error on failure", async () => {
      mockGqlFetch.mockRejectedValue(new Error("Failed to update"));

      const result = await setVehicleStatusAction("1", VehicleStatus.Maintenance);

      expect(result).toEqual({ error: "Failed to update" });
    });
  });
});
