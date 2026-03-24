import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VehicleStatusBadge } from "@/components/vehicles/VehicleStatusBadge";
import { VehicleStatus } from "@/lib/types/vehicle";

describe("VehicleStatusBadge", () => {
  it("renders Available status with correct label and styling", () => {
    render(<VehicleStatusBadge status={VehicleStatus.Available} />);

    const badge = screen.getByText("Available");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-emerald-500/10");
  });

  it("renders In Use status with correct label and styling", () => {
    render(<VehicleStatusBadge status={VehicleStatus.InUse} />);

    const badge = screen.getByText("In Use");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-amber-500/10");
  });

  it("renders Maintenance status with correct label and styling", () => {
    render(<VehicleStatusBadge status={VehicleStatus.Maintenance} />);

    const badge = screen.getByText("Maintenance");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-red-500/10");
  });

  it("renders Retired status with correct label and styling", () => {
    render(<VehicleStatusBadge status={VehicleStatus.Retired} />);

    const badge = screen.getByText("Retired");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-muted");
  });
});
