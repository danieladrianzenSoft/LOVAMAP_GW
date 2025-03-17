using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class OriginalFileNameScaffoldGroupAndSourceVersionDomainScaffold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DescriptorSource",
                table: "Scaffolds",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DescriptorSourceVersion",
                table: "Scaffolds",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OriginalFileName",
                table: "ScaffoldGroups",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Domains",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Version",
                table: "Domains",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DescriptorSource",
                table: "Scaffolds");

            migrationBuilder.DropColumn(
                name: "DescriptorSourceVersion",
                table: "Scaffolds");

            migrationBuilder.DropColumn(
                name: "OriginalFileName",
                table: "ScaffoldGroups");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Domains");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "Domains");
        }
    }
}
