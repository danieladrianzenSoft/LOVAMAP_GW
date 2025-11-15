using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class AddedFrozenDescriptorForPublication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "PublicationDatasets",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldDefaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.CreateTable(
                name: "PublicationDatasetsVersions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PublicationDatasetId = table.Column<int>(type: "integer", nullable: false),
                    Version = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExportPath = table.Column<string>(type: "text", nullable: true),
                    ExportSha256 = table.Column<string>(type: "text", nullable: true),
                    Description = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicationDatasetsVersions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PublicationDatasetsVersions_PublicationDatasets_Publication~",
                        column: x => x.PublicationDatasetId,
                        principalTable: "PublicationDatasets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PublicationDatasetFrozenDescriptors",
                columns: table => new
                {
                    PublicationDatasetVersionId = table.Column<int>(type: "integer", nullable: false),
                    ScaffoldId = table.Column<int>(type: "integer", nullable: false),
                    DescriptorTypeId = table.Column<int>(type: "integer", nullable: false),
                    GlobalDescriptorId = table.Column<int>(type: "integer", nullable: true),
                    PoreDescriptorId = table.Column<int>(type: "integer", nullable: true),
                    OtherDescriptorId = table.Column<int>(type: "integer", nullable: true),
                    JobId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicationDatasetFrozenDescriptors", x => new { x.PublicationDatasetVersionId, x.ScaffoldId, x.DescriptorTypeId });
                    table.ForeignKey(
                        name: "FK_PublicationDatasetFrozenDescriptors_PublicationDatasetsVers~",
                        column: x => x.PublicationDatasetVersionId,
                        principalTable: "PublicationDatasetsVersions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublicationDatasetsVersions_PublicationDatasetId_Version",
                table: "PublicationDatasetsVersions",
                columns: new[] { "PublicationDatasetId", "Version" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublicationDatasetFrozenDescriptors");

            migrationBuilder.DropTable(
                name: "PublicationDatasetsVersions");

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "PublicationDatasets",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP",
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");
        }
    }
}
