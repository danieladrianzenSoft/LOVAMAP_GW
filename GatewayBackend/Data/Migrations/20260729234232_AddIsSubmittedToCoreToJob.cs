using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIsSubmittedToCoreToJob : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsSubmittedToCore",
                table: "Jobs",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Backfill: mark all existing non-terminal jobs as submitted so they continue to be polled
            migrationBuilder.Sql(
                "UPDATE \"Jobs\" SET \"IsSubmittedToCore\" = true WHERE \"Status\" IN (0, 1)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSubmittedToCore",
                table: "Jobs");
        }
    }
}
