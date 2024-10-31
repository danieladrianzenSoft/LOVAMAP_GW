using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class AddedToScaffoldGroupReferenceToImage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "ScaffoldId",
                table: "Images",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "ScaffoldGroupId",
                table: "Images",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Images_ScaffoldGroupId",
                table: "Images",
                column: "ScaffoldGroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_Images_ScaffoldGroups_ScaffoldGroupId",
                table: "Images",
                column: "ScaffoldGroupId",
                principalTable: "ScaffoldGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Images_ScaffoldGroups_ScaffoldGroupId",
                table: "Images");

            migrationBuilder.DropIndex(
                name: "IX_Images_ScaffoldGroupId",
                table: "Images");

            migrationBuilder.DropColumn(
                name: "ScaffoldGroupId",
                table: "Images");

            migrationBuilder.AlterColumn<int>(
                name: "ScaffoldId",
                table: "Images",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
