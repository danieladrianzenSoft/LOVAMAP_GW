using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class AddedUserCreatorToJob : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatorId",
                table: "Jobs",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_CreatorId",
                table: "Jobs",
                column: "CreatorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_Users_CreatorId",
                table: "Jobs",
                column: "CreatorId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_Users_CreatorId",
                table: "Jobs");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_CreatorId",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "CreatorId",
                table: "Jobs");
        }
    }
}
