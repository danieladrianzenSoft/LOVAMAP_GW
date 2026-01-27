using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class AddedPublicationUploader : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Publications_UploaderId",
                table: "Publications",
                column: "UploaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_Publications_Users_UploaderId",
                table: "Publications",
                column: "UploaderId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Publications_Users_UploaderId",
                table: "Publications");

            migrationBuilder.DropIndex(
                name: "IX_Publications_UploaderId",
                table: "Publications");
        }
    }
}
