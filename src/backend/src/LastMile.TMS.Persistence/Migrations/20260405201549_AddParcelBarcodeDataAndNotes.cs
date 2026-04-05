using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddParcelBarcodeDataAndNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Parcels_ParcelType",
                table: "Parcels");

            migrationBuilder.DropIndex(
                name: "IX_Parcels_TrackingNumber_Trgm",
                table: "Parcels");

            migrationBuilder.AddColumn<string>(
                name: "BarcodeData",
                table: "Parcels",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "Parcels",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BarcodeData",
                table: "Parcels");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Parcels");

            migrationBuilder.CreateIndex(
                name: "IX_Parcels_ParcelType",
                table: "Parcels",
                column: "ParcelType");

            migrationBuilder.CreateIndex(
                name: "IX_Parcels_TrackingNumber_Trgm",
                table: "Parcels",
                column: "TrackingNumber")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });
        }
    }
}
