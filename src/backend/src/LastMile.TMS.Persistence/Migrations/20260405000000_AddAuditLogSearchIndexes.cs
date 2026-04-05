using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(AppDbContext))]
    [Migration("20260405000000_AddAuditLogSearchIndexes")]
    public partial class AddAuditLogSearchIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE EXTENSION IF NOT EXISTS pg_trgm;
                """);

            // Add trigram GIN index on ActorUserName for case-insensitive contains search (ILIKE)
            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_AuditLogs_ActorUserName_Trigram" 
                ON "AuditLogs" USING GIN ("ActorUserName" gin_trgm_ops);
                """);

            // Add ResourceType index for filtering by resource type
            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_AuditLogs_ResourceType" 
                ON "AuditLogs" ("ResourceType");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX IF EXISTS "IX_AuditLogs_ActorUserName_Trigram";
                """);

            migrationBuilder.Sql(
                """
                DROP INDEX IF EXISTS "IX_AuditLogs_ResourceType";
                """);
        }
    }
}
