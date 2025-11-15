using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class AddedPublicationDataset : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PoreDescriptors",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "OtherDescriptors",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "GlobalDescriptors",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateTable(
                name: "PublicationDatasets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PublicationId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicationDatasets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PublicationDatasets_Publications_PublicationId",
                        column: x => x.PublicationId,
                        principalTable: "Publications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PublicationDatasetDescriptorRules",
                columns: table => new
                {
                    PublicationDatasetId = table.Column<int>(type: "integer", nullable: false),
                    DescriptorTypeId = table.Column<int>(type: "integer", nullable: false),
                    JobMode = table.Column<int>(type: "integer", nullable: false),
                    JobId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicationDatasetDescriptorRules", x => new { x.PublicationDatasetId, x.DescriptorTypeId });
                    table.ForeignKey(
                        name: "FK_PublicationDatasetDescriptorRules_DescriptorTypes_Descripto~",
                        column: x => x.DescriptorTypeId,
                        principalTable: "DescriptorTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PublicationDatasetDescriptorRules_PublicationDatasets_Publi~",
                        column: x => x.PublicationDatasetId,
                        principalTable: "PublicationDatasets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PublicationDatasetScaffolds",
                columns: table => new
                {
                    PublicationDatasetId = table.Column<int>(type: "integer", nullable: false),
                    ScaffoldId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PublicationDatasetScaffolds", x => new { x.PublicationDatasetId, x.ScaffoldId });
                    table.ForeignKey(
                        name: "FK_PublicationDatasetScaffolds_PublicationDatasets_Publication~",
                        column: x => x.PublicationDatasetId,
                        principalTable: "PublicationDatasets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PublicationDatasetScaffolds_Scaffolds_ScaffoldId",
                        column: x => x.ScaffoldId,
                        principalTable: "Scaffolds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PublicationDatasetDescriptorRules_DescriptorTypeId",
                table: "PublicationDatasetDescriptorRules",
                column: "DescriptorTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_PublicationDatasets_PublicationId_Name",
                table: "PublicationDatasets",
                columns: new[] { "PublicationId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_PublicationDatasetScaffolds_ScaffoldId",
                table: "PublicationDatasetScaffolds",
                column: "ScaffoldId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PublicationDatasetDescriptorRules");

            migrationBuilder.DropTable(
                name: "PublicationDatasetScaffolds");

            migrationBuilder.DropTable(
                name: "PublicationDatasets");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "PoreDescriptors");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "OtherDescriptors");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "GlobalDescriptors");
        }
    }
}
