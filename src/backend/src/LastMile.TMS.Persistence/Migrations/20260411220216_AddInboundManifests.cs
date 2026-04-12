using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInboundManifests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InboundManifests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ManifestNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DepotId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    MaxParcels = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    LastModifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InboundManifests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InboundManifests_Depots_DepotId",
                        column: x => x.DepotId,
                        principalTable: "Depots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "InboundManifestParcels",
                columns: table => new
                {
                    InboundManifestId = table.Column<Guid>(type: "uuid", nullable: false),
                    ParcelsId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InboundManifestParcels", x => new { x.InboundManifestId, x.ParcelsId });
                    table.ForeignKey(
                        name: "FK_InboundManifestParcels_InboundManifests_InboundManifestId",
                        column: x => x.InboundManifestId,
                        principalTable: "InboundManifests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_InboundManifestParcels_Parcels_ParcelsId",
                        column: x => x.ParcelsId,
                        principalTable: "Parcels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "InboundReceivingSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ManifestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    DockDoor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    StartedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ConfirmedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ConfirmedBy = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    LastModifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InboundReceivingSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InboundReceivingSessions_InboundManifests_ManifestId",
                        column: x => x.ManifestId,
                        principalTable: "InboundManifests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InboundManifestParcels_ParcelsId",
                table: "InboundManifestParcels",
                column: "ParcelsId");

            migrationBuilder.CreateIndex(
                name: "IX_InboundManifests_DepotId",
                table: "InboundManifests",
                column: "DepotId");

            migrationBuilder.CreateIndex(
                name: "IX_InboundManifests_ManifestNumber",
                table: "InboundManifests",
                column: "ManifestNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InboundManifests_Status",
                table: "InboundManifests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_InboundReceivingSessions_ManifestId",
                table: "InboundReceivingSessions",
                column: "ManifestId");

            migrationBuilder.CreateIndex(
                name: "IX_InboundReceivingSessions_Status",
                table: "InboundReceivingSessions",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InboundManifestParcels");

            migrationBuilder.DropTable(
                name: "InboundReceivingSessions");

            migrationBuilder.DropTable(
                name: "InboundManifests");
        }
    }
}
