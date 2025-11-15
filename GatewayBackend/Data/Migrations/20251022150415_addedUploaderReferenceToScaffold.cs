using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class addedUploaderReferenceToScaffold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Comments",
                table: "Scaffolds",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Scaffolds",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "UploaderId",
                table: "Scaffolds",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Scaffolds_UploaderId",
                table: "Scaffolds",
                column: "UploaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_Scaffolds_Users_UploaderId",
                table: "Scaffolds",
                column: "UploaderId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Scaffolds_Users_UploaderId",
                table: "Scaffolds");

            migrationBuilder.DropIndex(
                name: "IX_Scaffolds_UploaderId",
                table: "Scaffolds");

            migrationBuilder.DropColumn(
                name: "Comments",
                table: "Scaffolds");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Scaffolds");

            migrationBuilder.DropColumn(
                name: "UploaderId",
                table: "Scaffolds");
        }
    }
}
