using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddedIsPublicToScaffoldGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsPublic",
                table: "ScaffoldGroups",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPublic",
                table: "ScaffoldGroups");
        }
    }
}
