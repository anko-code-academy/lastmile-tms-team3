using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddParcelSearchIndexesAndContentItemsCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .Annotation("Npgsql:PostgresExtension:postgis", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");

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

            migrationBuilder.CreateIndex(
                name: "IX_Addresses_City_Trgm",
                table: "Addresses",
                column: "City")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Parcels_ParcelType",
                table: "Parcels");

            migrationBuilder.DropIndex(
                name: "IX_Parcels_TrackingNumber_Trgm",
                table: "Parcels");

            migrationBuilder.DropIndex(
                name: "IX_Addresses_City_Trgm",
                table: "Addresses");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,")
                .OldAnnotation("Npgsql:PostgresExtension:postgis", ",,");
        }
    }
}
