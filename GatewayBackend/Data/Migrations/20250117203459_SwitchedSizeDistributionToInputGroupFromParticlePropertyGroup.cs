using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class SwitchedSizeDistributionToInputGroupFromParticlePropertyGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParticlePropertyGroups_InputGroups_InputGroupId",
                table: "ParticlePropertyGroups");

            migrationBuilder.DropColumn(
                name: "SizeDistribution",
                table: "ParticlePropertyGroups");

            migrationBuilder.AddColumn<JsonDocument>(
                name: "SizeDistribution",
                table: "InputGroups",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ParticlePropertyGroups_InputGroups_InputGroupId",
                table: "ParticlePropertyGroups",
                column: "InputGroupId",
                principalTable: "InputGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParticlePropertyGroups_InputGroups_InputGroupId",
                table: "ParticlePropertyGroups");

            migrationBuilder.DropColumn(
                name: "SizeDistribution",
                table: "InputGroups");

            migrationBuilder.AddColumn<JsonDocument>(
                name: "SizeDistribution",
                table: "ParticlePropertyGroups",
                type: "jsonb",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ParticlePropertyGroups_InputGroups_InputGroupId",
                table: "ParticlePropertyGroups",
                column: "InputGroupId",
                principalTable: "InputGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
