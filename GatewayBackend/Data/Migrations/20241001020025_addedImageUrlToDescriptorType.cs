using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class addedImageUrlToDescriptorType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Doi",
                table: "Publications",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "DescriptorTypes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "DescriptorTypes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PublicationId",
                table: "DescriptorTypes",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DescriptorTypes_PublicationId",
                table: "DescriptorTypes",
                column: "PublicationId");

            migrationBuilder.AddForeignKey(
                name: "FK_DescriptorTypes_Publications_PublicationId",
                table: "DescriptorTypes",
                column: "PublicationId",
                principalTable: "Publications",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_DescriptorTypes_Publications_PublicationId",
                table: "DescriptorTypes");

            migrationBuilder.DropIndex(
                name: "IX_DescriptorTypes_PublicationId",
                table: "DescriptorTypes");

            migrationBuilder.DropColumn(
                name: "Doi",
                table: "Publications");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "DescriptorTypes");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "DescriptorTypes");

            migrationBuilder.DropColumn(
                name: "PublicationId",
                table: "DescriptorTypes");
        }
    }
}
