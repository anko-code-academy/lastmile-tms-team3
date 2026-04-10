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
            migrationBuilder.AddColumn<Guid>(
                name: "RouteId",
                table: "Parcels",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DeliveryRoutes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DepotId = table.Column<Guid>(type: "uuid", nullable: false),
                    DriverId = table.Column<Guid>(type: "uuid", nullable: true),
                    ZoneId = table.Column<Guid>(type: "uuid", nullable: true),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    LastModifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DeliveryRoutes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DeliveryRoutes_Depots_DepotId",
                        column: x => x.DepotId,
                        principalTable: "Depots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DeliveryRoutes_Drivers_DriverId",
                        column: x => x.DriverId,
                        principalTable: "Drivers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DeliveryRoutes_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Parcels_RouteId",
                table: "Parcels",
                column: "RouteId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_DepotId",
                table: "DeliveryRoutes",
                column: "DepotId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_DriverId",
                table: "DeliveryRoutes",
                column: "DriverId");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_ZoneId",
                table: "DeliveryRoutes",
                column: "ZoneId");

            migrationBuilder.AddForeignKey(
                name: "FK_Parcels_DeliveryRoutes_RouteId",
                table: "Parcels",
                column: "RouteId",
                principalTable: "DeliveryRoutes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Parcels_DeliveryRoutes_RouteId",
                table: "Parcels");

            migrationBuilder.DropTable(
                name: "DeliveryRoutes");

            migrationBuilder.DropIndex(
                name: "IX_Parcels_RouteId",
                table: "Parcels");

            migrationBuilder.DropColumn(
                name: "RouteId",
                table: "Parcels");
        }
    }
}
