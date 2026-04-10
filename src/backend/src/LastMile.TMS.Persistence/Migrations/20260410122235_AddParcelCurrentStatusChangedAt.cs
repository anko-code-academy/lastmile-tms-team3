using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddParcelCurrentStatusChangedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CurrentStatusChangedAt",
                table: "Parcels",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.CreateIndex(
                name: "IX_Parcels_Status_CurrentStatusChangedAt",
                table: "Parcels",
                columns: new[] { "Status", "CurrentStatusChangedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Parcels_Status_CurrentStatusChangedAt",
                table: "Parcels");

            migrationBuilder.DropColumn(
                name: "CurrentStatusChangedAt",
                table: "Parcels");
        }
    }
}
