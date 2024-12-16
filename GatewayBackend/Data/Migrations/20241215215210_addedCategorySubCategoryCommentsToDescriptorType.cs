using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class addedCategorySubCategoryCommentsToDescriptorType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Comments",
                table: "DescriptorTypes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubCategory",
                table: "DescriptorTypes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Comments",
                table: "DescriptorTypes");

            migrationBuilder.DropColumn(
                name: "SubCategory",
                table: "DescriptorTypes");
        }
    }
}
