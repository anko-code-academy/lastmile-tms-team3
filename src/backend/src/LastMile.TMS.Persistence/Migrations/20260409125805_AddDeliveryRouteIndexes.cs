using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDeliveryRouteIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_Date",
                table: "DeliveryRoutes",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_Name",
                table: "DeliveryRoutes",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_DeliveryRoutes_Status",
                table: "DeliveryRoutes",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DeliveryRoutes_Date",
                table: "DeliveryRoutes");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryRoutes_Name",
                table: "DeliveryRoutes");

            migrationBuilder.DropIndex(
                name: "IX_DeliveryRoutes_Status",
                table: "DeliveryRoutes");
        }
    }
}
