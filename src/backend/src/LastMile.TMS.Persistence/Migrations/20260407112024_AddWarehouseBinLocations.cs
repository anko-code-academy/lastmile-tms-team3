using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWarehouseBinLocations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CurrentBinId",
                table: "Parcels",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Aisles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ZoneId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    LastModifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Aisles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Aisles_Zones_ZoneId",
                        column: x => x.ZoneId,
                        principalTable: "Zones",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Bins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    LabelCode = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CapacityParcelCount = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    AisleId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedBy = table.Column<string>(type: "text", nullable: true),
                    LastModifiedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastModifiedBy = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Bins", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Bins_Aisles_AisleId",
                        column: x => x.AisleId,
                        principalTable: "Aisles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Parcels_CurrentBinId",
                table: "Parcels",
                column: "CurrentBinId");

            migrationBuilder.CreateIndex(
                name: "IX_Aisles_ZoneId_Code",
                table: "Aisles",
                columns: new[] { "ZoneId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Aisles_ZoneId_IsActive",
                table: "Aisles",
                columns: new[] { "ZoneId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Bins_AisleId_Code",
                table: "Bins",
                columns: new[] { "AisleId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Bins_AisleId_IsActive",
                table: "Bins",
                columns: new[] { "AisleId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Bins_LabelCode",
                table: "Bins",
                column: "LabelCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Depots_IsActive",
                table: "Depots",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_Zones_DepotId_IsActive",
                table: "Zones",
                columns: new[] { "DepotId", "IsActive" });

            migrationBuilder.AddForeignKey(
                name: "FK_Parcels_Bins_CurrentBinId",
                table: "Parcels",
                column: "CurrentBinId",
                principalTable: "Bins",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Parcels_Bins_CurrentBinId",
                table: "Parcels");

            migrationBuilder.DropIndex(
                name: "IX_Depots_IsActive",
                table: "Depots");

            migrationBuilder.DropIndex(
                name: "IX_Zones_DepotId_IsActive",
                table: "Zones");

            migrationBuilder.DropTable(
                name: "Bins");

            migrationBuilder.DropTable(
                name: "Aisles");

            migrationBuilder.DropIndex(
                name: "IX_Parcels_CurrentBinId",
                table: "Parcels");

            migrationBuilder.DropColumn(
                name: "CurrentBinId",
                table: "Parcels");
        }
    }
}
