using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryRoute : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DeliveryRoutes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    ZoneId = table.Column<Guid>(type: "uuid", nullable: false),
                    DriverId = table.Column<Guid>(type: "uuid", nullable: true),
                    VehicleId = table.Column<Guid>(type: "uuid", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    EstimatedDistance = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    EstimatedStops = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    LastModifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryRoutes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryRoutes_Drivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "Drivers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DeliveryRoutes_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DeliveryRoutes_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RouteParcels",
                columns: table => new
                {
                    RouteId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParcelId = table.Column<Guid>(type: "uuid", nullable: false),
                    StopOrder = table.Column<int>(type: "integer", nullable: false),
                    AddedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RouteParcels", x => new { x.RouteId, x.ParcelId });
                    table.ForeignKey(
                        name: "FK_RouteParcels_DeliveryRoutes_RouteId",
                        column: x => x.RouteId,
                        principalTable: "DeliveryRoutes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RouteParcels_Parcels_ParcelId",
                        column: x => x.ParcelId,
                        principalTable: "Parcels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_Date",
                table: "DeliveryRoutes",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_Date_ZoneId",
                table: "DeliveryRoutes",
                columns: new[] { "Date", "ZoneId" });

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_DriverId",
                table: "DeliveryRoutes",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_Status",
                table: "DeliveryRoutes",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_VehicleId",
                table: "DeliveryRoutes",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_ZoneId",
                table: "DeliveryRoutes",
                column: "ZoneId");

            migrationBuilder.CreateIndex(
                name: "IX_RouteParcels_ParcelId",
                table: "RouteParcels",
                column: "ParcelId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RouteParcels");

            migrationBuilder.DropTable(
                name: "DeliveryRoutes");
        }
    }
}
