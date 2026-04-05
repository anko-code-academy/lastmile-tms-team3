using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogCorrelationIdIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_CorrelationId",
                table: "AuditLogs",
                column: "CorrelationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_CorrelationId",
                table: "AuditLogs");
        }
    }
}
