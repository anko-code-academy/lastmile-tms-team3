using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LastMile.TMS.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OccurredAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ActorUserId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    ActorUserName = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true),
                    ActionType = table.Column<string>(type: "text", nullable: false),
                    ResourceType = table.Column<string>(type: "text", nullable: false),
                    ResourceId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CorrelationId = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Summary = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    BeforeValuesJson = table.Column<string>(type: "jsonb", nullable: true),
                    AfterValuesJson = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditLogs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActionType",
                table: "AuditLogs",
                column: "ActionType");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ActorUserId",
                table: "AuditLogs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_OccurredAt",
                table: "AuditLogs",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ResourceType_ResourceId",
                table: "AuditLogs",
                columns: new[] { "ResourceType", "ResourceId" });

            migrationBuilder.Sql(
                """
                CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
                RETURNS trigger AS
                $$
                BEGIN
                    RAISE EXCEPTION 'Audit logs are append-only and cannot be updated or deleted.';
                END;
                $$ LANGUAGE plpgsql;
                """);

            migrationBuilder.Sql(
                """
                CREATE TRIGGER trg_audit_logs_append_only
                BEFORE UPDATE OR DELETE ON "AuditLogs"
                FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON \"AuditLogs\";");
            migrationBuilder.Sql("DROP FUNCTION IF EXISTS prevent_audit_log_mutation();");

            migrationBuilder.DropTable(
                name: "AuditLogs");
        }
    }
}
