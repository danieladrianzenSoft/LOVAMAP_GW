using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class ChangedDeleteBehaviorCascadePPGs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParticlePropertyGroups_InputGroups_InputGroupId",
                table: "ParticlePropertyGroups");

            migrationBuilder.AddForeignKey(
                name: "FK_ParticlePropertyGroups_InputGroups_InputGroupId",
                table: "ParticlePropertyGroups",
                column: "InputGroupId",
                principalTable: "InputGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ParticlePropertyGroups_InputGroups_InputGroupId",
                table: "ParticlePropertyGroups");

            migrationBuilder.AddForeignKey(
                name: "FK_ParticlePropertyGroups_InputGroups_InputGroupId",
                table: "ParticlePropertyGroups",
                column: "InputGroupId",
                principalTable: "InputGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
