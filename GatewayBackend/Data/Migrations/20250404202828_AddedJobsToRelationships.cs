using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class AddedJobsToRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GlobalDescriptors_Scaffolds_ScaffoldId",
                table: "GlobalDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_OtherDescriptors_Scaffolds_ScaffoldId",
                table: "OtherDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_PoreDescriptors_Scaffolds_ScaffoldId",
                table: "PoreDescriptors");

            migrationBuilder.DropColumn(
                name: "DescriptorSource",
                table: "Scaffolds");

            migrationBuilder.DropColumn(
                name: "DescriptorSourceVersion",
                table: "Scaffolds");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "Domains");

            migrationBuilder.RenameColumn(
                name: "Version",
                table: "Domains",
                newName: "SegmentationVersion");

            migrationBuilder.AddColumn<Guid>(
                name: "LatestJobId",
                table: "Scaffolds",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "JobId",
                table: "PoreDescriptors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "JobId",
                table: "OtherDescriptors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "JobId",
                table: "GlobalDescriptors",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DomainSource",
                table: "Domains",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<Guid>(
                name: "ProducedByJobId",
                table: "Domains",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Jobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ScaffoldId = table.Column<int>(type: "integer", nullable: false),
                    InputDomainId = table.Column<int>(type: "integer", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LovamapCoreVersion = table.Column<string>(type: "text", nullable: true),
                    FinalHeartbeatMessage = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Jobs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Jobs_Domains_InputDomainId",
                        column: x => x.InputDomainId,
                        principalTable: "Domains",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Jobs_Scaffolds_ScaffoldId",
                        column: x => x.ScaffoldId,
                        principalTable: "Scaffolds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Scaffolds_LatestJobId",
                table: "Scaffolds",
                column: "LatestJobId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PoreDescriptors_JobId",
                table: "PoreDescriptors",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_OtherDescriptors_JobId",
                table: "OtherDescriptors",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_GlobalDescriptors_JobId",
                table: "GlobalDescriptors",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_Domains_ProducedByJobId",
                table: "Domains",
                column: "ProducedByJobId");

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_InputDomainId",
                table: "Jobs",
                column: "InputDomainId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_ScaffoldId",
                table: "Jobs",
                column: "ScaffoldId");

            migrationBuilder.AddForeignKey(
                name: "FK_Domains_Jobs_ProducedByJobId",
                table: "Domains",
                column: "ProducedByJobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_GlobalDescriptors_Jobs_JobId",
                table: "GlobalDescriptors",
                column: "JobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_GlobalDescriptors_Scaffolds_ScaffoldId",
                table: "GlobalDescriptors",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_OtherDescriptors_Jobs_JobId",
                table: "OtherDescriptors",
                column: "JobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_OtherDescriptors_Scaffolds_ScaffoldId",
                table: "OtherDescriptors",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PoreDescriptors_Jobs_JobId",
                table: "PoreDescriptors",
                column: "JobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_PoreDescriptors_Scaffolds_ScaffoldId",
                table: "PoreDescriptors",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Scaffolds_Jobs_LatestJobId",
                table: "Scaffolds",
                column: "LatestJobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Domains_Jobs_ProducedByJobId",
                table: "Domains");

            migrationBuilder.DropForeignKey(
                name: "FK_GlobalDescriptors_Jobs_JobId",
                table: "GlobalDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_GlobalDescriptors_Scaffolds_ScaffoldId",
                table: "GlobalDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_OtherDescriptors_Jobs_JobId",
                table: "OtherDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_OtherDescriptors_Scaffolds_ScaffoldId",
                table: "OtherDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_PoreDescriptors_Jobs_JobId",
                table: "PoreDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_PoreDescriptors_Scaffolds_ScaffoldId",
                table: "PoreDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_Scaffolds_Jobs_LatestJobId",
                table: "Scaffolds");

            migrationBuilder.DropTable(
                name: "Jobs");

            migrationBuilder.DropIndex(
                name: "IX_Scaffolds_LatestJobId",
                table: "Scaffolds");

            migrationBuilder.DropIndex(
                name: "IX_PoreDescriptors_JobId",
                table: "PoreDescriptors");

            migrationBuilder.DropIndex(
                name: "IX_OtherDescriptors_JobId",
                table: "OtherDescriptors");

            migrationBuilder.DropIndex(
                name: "IX_GlobalDescriptors_JobId",
                table: "GlobalDescriptors");

            migrationBuilder.DropIndex(
                name: "IX_Domains_ProducedByJobId",
                table: "Domains");

            migrationBuilder.DropColumn(
                name: "LatestJobId",
                table: "Scaffolds");

            migrationBuilder.DropColumn(
                name: "JobId",
                table: "PoreDescriptors");

            migrationBuilder.DropColumn(
                name: "JobId",
                table: "OtherDescriptors");

            migrationBuilder.DropColumn(
                name: "JobId",
                table: "GlobalDescriptors");

            migrationBuilder.DropColumn(
                name: "DomainSource",
                table: "Domains");

            migrationBuilder.DropColumn(
                name: "ProducedByJobId",
                table: "Domains");

            migrationBuilder.RenameColumn(
                name: "SegmentationVersion",
                table: "Domains",
                newName: "Version");

            migrationBuilder.AddColumn<string>(
                name: "DescriptorSource",
                table: "Scaffolds",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DescriptorSourceVersion",
                table: "Scaffolds",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "Domains",
                type: "text",
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_GlobalDescriptors_Scaffolds_ScaffoldId",
                table: "GlobalDescriptors",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OtherDescriptors_Scaffolds_ScaffoldId",
                table: "OtherDescriptors",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PoreDescriptors_Scaffolds_ScaffoldId",
                table: "PoreDescriptors",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
