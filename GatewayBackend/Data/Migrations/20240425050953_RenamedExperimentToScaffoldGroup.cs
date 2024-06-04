using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Data.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenamedExperimentToScaffoldGroup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Scaffolds_Experiments_ExperimentId",
                table: "Scaffolds");

            migrationBuilder.DropForeignKey(
                name: "FK_Thumbnails_Experiments_ExperimentId",
                table: "Thumbnails");

            migrationBuilder.DropTable(
                name: "Experiments");

            migrationBuilder.DropIndex(
                name: "IX_Thumbnails_ExperimentId",
                table: "Thumbnails");

            migrationBuilder.DropColumn(
                name: "ExperimentId",
                table: "Thumbnails");

            migrationBuilder.DropColumn(
                name: "ExperimentId",
                table: "InputGroups");

            migrationBuilder.RenameColumn(
                name: "ExperimentId",
                table: "Scaffolds",
                newName: "ScaffoldGroupId");

            migrationBuilder.RenameIndex(
                name: "IX_Scaffolds_ExperimentId",
                table: "Scaffolds",
                newName: "IX_Scaffolds_ScaffoldGroupId");

            migrationBuilder.AddColumn<int>(
                name: "ScaffoldGroupId",
                table: "Thumbnails",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "ScaffoldGroupId",
                table: "InputGroups",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ScaffoldGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "text", nullable: false),
                    UploaderId = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsSimulated = table.Column<bool>(type: "boolean", nullable: false),
                    Comments = table.Column<string>(type: "text", nullable: true),
                    PublicationId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ScaffoldGroups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ScaffoldGroups_Publications_PublicationId",
                        column: x => x.PublicationId,
                        principalTable: "Publications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ScaffoldGroups_Users_UploaderId",
                        column: x => x.UploaderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Thumbnails_ScaffoldGroupId",
                table: "Thumbnails",
                column: "ScaffoldGroupId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InputGroups_ScaffoldGroupId",
                table: "InputGroups",
                column: "ScaffoldGroupId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ScaffoldGroups_PublicationId",
                table: "ScaffoldGroups",
                column: "PublicationId");

            migrationBuilder.CreateIndex(
                name: "IX_ScaffoldGroups_UploaderId",
                table: "ScaffoldGroups",
                column: "UploaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_InputGroups_ScaffoldGroups_ScaffoldGroupId",
                table: "InputGroups",
                column: "ScaffoldGroupId",
                principalTable: "ScaffoldGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Scaffolds_ScaffoldGroups_ScaffoldGroupId",
                table: "Scaffolds",
                column: "ScaffoldGroupId",
                principalTable: "ScaffoldGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Thumbnails_ScaffoldGroups_ScaffoldGroupId",
                table: "Thumbnails",
                column: "ScaffoldGroupId",
                principalTable: "ScaffoldGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_InputGroups_ScaffoldGroups_ScaffoldGroupId",
                table: "InputGroups");

            migrationBuilder.DropForeignKey(
                name: "FK_Scaffolds_ScaffoldGroups_ScaffoldGroupId",
                table: "Scaffolds");

            migrationBuilder.DropForeignKey(
                name: "FK_Thumbnails_ScaffoldGroups_ScaffoldGroupId",
                table: "Thumbnails");

            migrationBuilder.DropTable(
                name: "ScaffoldGroups");

            migrationBuilder.DropIndex(
                name: "IX_Thumbnails_ScaffoldGroupId",
                table: "Thumbnails");

            migrationBuilder.DropIndex(
                name: "IX_InputGroups_ScaffoldGroupId",
                table: "InputGroups");

            migrationBuilder.DropColumn(
                name: "ScaffoldGroupId",
                table: "Thumbnails");

            migrationBuilder.DropColumn(
                name: "ScaffoldGroupId",
                table: "InputGroups");

            migrationBuilder.RenameColumn(
                name: "ScaffoldGroupId",
                table: "Scaffolds",
                newName: "ExperimentId");

            migrationBuilder.RenameIndex(
                name: "IX_Scaffolds_ScaffoldGroupId",
                table: "Scaffolds",
                newName: "IX_Scaffolds_ExperimentId");

            migrationBuilder.AddColumn<int>(
                name: "ExperimentId",
                table: "Thumbnails",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ExperimentId",
                table: "InputGroups",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Experiments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false),
                    PublicationId = table.Column<int>(type: "integer", nullable: true),
                    UploaderId = table.Column<string>(type: "text", nullable: true),
                    Comments = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsSimulated = table.Column<bool>(type: "boolean", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Experiments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Experiments_InputGroups_Id",
                        column: x => x.Id,
                        principalTable: "InputGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Experiments_Publications_PublicationId",
                        column: x => x.PublicationId,
                        principalTable: "Publications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Experiments_Users_UploaderId",
                        column: x => x.UploaderId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Thumbnails_ExperimentId",
                table: "Thumbnails",
                column: "ExperimentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Experiments_PublicationId",
                table: "Experiments",
                column: "PublicationId");

            migrationBuilder.CreateIndex(
                name: "IX_Experiments_UploaderId",
                table: "Experiments",
                column: "UploaderId");

            migrationBuilder.AddForeignKey(
                name: "FK_Scaffolds_Experiments_ExperimentId",
                table: "Scaffolds",
                column: "ExperimentId",
                principalTable: "Experiments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Thumbnails_Experiments_ExperimentId",
                table: "Thumbnails",
                column: "ExperimentId",
                principalTable: "Experiments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
