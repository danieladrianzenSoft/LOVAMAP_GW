using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class MedianMaxMinSize : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "MaxSize",
                table: "ParticlePropertyGroups",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "MedianSize",
                table: "ParticlePropertyGroups",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "MinSize",
                table: "ParticlePropertyGroups",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxSize",
                table: "ParticlePropertyGroups");

            migrationBuilder.DropColumn(
                name: "MedianSize",
                table: "ParticlePropertyGroups");

            migrationBuilder.DropColumn(
                name: "MinSize",
                table: "ParticlePropertyGroups");
        }
    }
}
