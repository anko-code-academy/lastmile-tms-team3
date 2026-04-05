using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDriverAndVehicleSearchIndexesAndGraphqlSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_CreatedAt",
                table: "Vehicles",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_RegistrationPlate_Trgm",
                table: "Vehicles",
                column: "RegistrationPlate")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_Drivers_CreatedAt",
                table: "Drivers",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Drivers_Email_Trgm",
                table: "Drivers",
                column: "Email")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_Drivers_FirstName_Trgm",
                table: "Drivers",
                column: "FirstName")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_Drivers_LastName_Trgm",
                table: "Drivers",
                column: "LastName")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });

            migrationBuilder.CreateIndex(
                name: "IX_Drivers_LicenseNumber_Trgm",
                table: "Drivers",
                column: "LicenseNumber")
                .Annotation("Npgsql:IndexMethod", "GIN")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Vehicles_CreatedAt",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_RegistrationPlate_Trgm",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_Drivers_CreatedAt",
                table: "Drivers");

            migrationBuilder.DropIndex(
                name: "IX_Drivers_Email_Trgm",
                table: "Drivers");

            migrationBuilder.DropIndex(
                name: "IX_Drivers_FirstName_Trgm",
                table: "Drivers");

            migrationBuilder.DropIndex(
                name: "IX_Drivers_LastName_Trgm",
                table: "Drivers");

            migrationBuilder.DropIndex(
                name: "IX_Drivers_LicenseNumber_Trgm",
                table: "Drivers");
        }
    }
}
