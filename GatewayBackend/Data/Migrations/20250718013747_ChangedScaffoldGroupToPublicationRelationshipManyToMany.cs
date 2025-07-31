using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class ChangedScaffoldGroupToPublicationRelationshipManyToMany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ScaffoldGroups_Publications_PublicationId",
                table: "ScaffoldGroups");

            migrationBuilder.DropIndex(
                name: "IX_ScaffoldGroups_PublicationId",
                table: "ScaffoldGroups");

            migrationBuilder.CreateTable(
                name: "ScaffoldGroupPublication",
                columns: table => new
                {
                    ScaffoldGroupId = table.Column<int>(type: "integer", nullable: false),
                    PublicationId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScaffoldGroupPublication", x => new { x.ScaffoldGroupId, x.PublicationId });
                    table.ForeignKey(
                        name: "FK_ScaffoldGroupPublication_Publications_PublicationId",
                        column: x => x.PublicationId,
                        principalTable: "Publications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ScaffoldGroupPublication_ScaffoldGroups_ScaffoldGroupId",
                        column: x => x.ScaffoldGroupId,
                        principalTable: "ScaffoldGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ScaffoldGroupPublication_PublicationId",
                table: "ScaffoldGroupPublication",
                column: "PublicationId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ScaffoldGroupPublication");

            migrationBuilder.CreateIndex(
                name: "IX_ScaffoldGroups_PublicationId",
                table: "ScaffoldGroups",
                column: "PublicationId");

            migrationBuilder.AddForeignKey(
                name: "FK_ScaffoldGroups_Publications_PublicationId",
                table: "ScaffoldGroups",
                column: "PublicationId",
                principalTable: "Publications",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
