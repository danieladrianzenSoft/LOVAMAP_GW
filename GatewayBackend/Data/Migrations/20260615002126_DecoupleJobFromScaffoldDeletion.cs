using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class DecoupleJobFromScaffoldDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_Domains_InputDomainId",
                table: "Jobs");

            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_Scaffolds_ScaffoldId",
                table: "Jobs");

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_Domains_InputDomainId",
                table: "Jobs",
                column: "InputDomainId",
                principalTable: "Domains",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_Scaffolds_ScaffoldId",
                table: "Jobs",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_Domains_InputDomainId",
                table: "Jobs");

            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_Scaffolds_ScaffoldId",
                table: "Jobs");

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_Domains_InputDomainId",
                table: "Jobs",
                column: "InputDomainId",
                principalTable: "Domains",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_Scaffolds_ScaffoldId",
                table: "Jobs",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
