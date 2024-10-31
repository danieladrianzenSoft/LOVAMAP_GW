using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class addedImageCategoryInsteadOfIsPlot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsPlot",
                table: "Images");

            migrationBuilder.AddColumn<int>(
                name: "Category",
                table: "Images",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Category",
                table: "Images");

            migrationBuilder.AddColumn<bool>(
                name: "IsPlot",
                table: "Images",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }
    }
}
