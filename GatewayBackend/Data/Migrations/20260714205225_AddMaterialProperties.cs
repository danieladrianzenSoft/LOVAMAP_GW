using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialProperties : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Material",
                table: "ParticlePropertyGroups",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImagingMethod",
                table: "InputGroups",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InterlinkingMechanism",
                table: "InputGroups",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ScaffoldOccupants",
                table: "InputGroups",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Material",
                table: "ParticlePropertyGroups");

            migrationBuilder.DropColumn(
                name: "ImagingMethod",
                table: "InputGroups");

            migrationBuilder.DropColumn(
                name: "InterlinkingMechanism",
                table: "InputGroups");

            migrationBuilder.DropColumn(
                name: "ScaffoldOccupants",
                table: "InputGroups");
        }
    }
}
