using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Data.Migrations
{
    /// <inheritdoc />
    public partial class ChangedDeleteBehaviorCascadeImagesDescriptors : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GlobalDescriptors_Jobs_JobId",
                table: "GlobalDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_GlobalDescriptors_Scaffolds_ScaffoldId",
                table: "GlobalDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_Images_ScaffoldGroups_ScaffoldGroupId",
                table: "Images");

            migrationBuilder.DropForeignKey(
                name: "FK_Images_Scaffolds_ScaffoldId",
                table: "Images");

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

            migrationBuilder.AddForeignKey(
                name: "FK_GlobalDescriptors_Jobs_JobId",
                table: "GlobalDescriptors",
                column: "JobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_GlobalDescriptors_Scaffolds_ScaffoldId",
                table: "GlobalDescriptors",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Images_ScaffoldGroups_ScaffoldGroupId",
                table: "Images",
                column: "ScaffoldGroupId",
                principalTable: "ScaffoldGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Images_Scaffolds_ScaffoldId",
                table: "Images",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_OtherDescriptors_Jobs_JobId",
                table: "OtherDescriptors",
                column: "JobId",
                principalTable: "Jobs",
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
                name: "FK_PoreDescriptors_Jobs_JobId",
                table: "PoreDescriptors",
                column: "JobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_PoreDescriptors_Scaffolds_ScaffoldId",
                table: "PoreDescriptors",
                column: "ScaffoldId",
                principalTable: "Scaffolds",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Scaffolds_Jobs_LatestJobId",
                table: "Scaffolds",
                column: "LatestJobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_GlobalDescriptors_Jobs_JobId",
                table: "GlobalDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_GlobalDescriptors_Scaffolds_ScaffoldId",
                table: "GlobalDescriptors");

            migrationBuilder.DropForeignKey(
                name: "FK_Images_ScaffoldGroups_ScaffoldGroupId",
                table: "Images");

            migrationBuilder.DropForeignKey(
                name: "FK_Images_Scaffolds_ScaffoldId",
                table: "Images");

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
                name: "FK_Images_ScaffoldGroups_ScaffoldGroupId",
                table: "Images",
                column: "ScaffoldGroupId",
                principalTable: "ScaffoldGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Images_Scaffolds_ScaffoldId",
                table: "Images",
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
    }
}
