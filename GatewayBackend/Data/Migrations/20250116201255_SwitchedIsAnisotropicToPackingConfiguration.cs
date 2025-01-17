using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class SwitchedIsAnisotropicToPackingConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Dx",
                table: "InputGroups");

            migrationBuilder.DropColumn(
                name: "IsAnisotropic",
                table: "InputGroups");

            migrationBuilder.DropColumn(
                name: "NumVoxels",
                table: "InputGroups");

            migrationBuilder.AddColumn<int>(
                name: "PackingConfiguration",
                table: "InputGroups",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PackingConfiguration",
                table: "InputGroups");

            migrationBuilder.AddColumn<int>(
                name: "Dx",
                table: "InputGroups",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAnisotropic",
                table: "InputGroups",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "NumVoxels",
                table: "InputGroups",
                type: "integer",
                nullable: true);
        }
    }
}
