using System.ComponentModel.DataAnnotations;

namespace Infrastructure.DTOs
{
	public class BatchMetadataUpdateRequestDto
	{
		[Required]
		public required string SourcePath { get; set; }
		public bool DryRun { get; set; } = true;
		public bool IncludeMeshes { get; set; } = false;
	}

	public class BatchMetadataUpdateResultDto
	{
		public bool DryRun { get; set; }
		public int TotalFilesScanned { get; set; }
		public int MatchedCount => Matched.Count;
		public int UnmatchedCount => UnmatchedFiles.Count;
		public int SucceededCount => Matched.Count(m => m.Updated);
		public int FailedCount => Errors.Count;
		public List<BatchMetadataMatchDto> Matched { get; set; } = new();
		public List<string> UnmatchedFiles { get; set; } = new();
		public List<string> Errors { get; set; } = new();
	}

	public class BatchMetadataMatchDto
	{
		public string FileName { get; set; } = string.Empty;
		public int DomainId { get; set; }
		public int ScaffoldId { get; set; }
		public string Category { get; set; } = string.Empty;
		public string MatchedOriginalFileName { get; set; } = string.Empty;
		public bool HasCompanionMesh { get; set; }
		public bool Updated { get; set; }
	}

	public class MetadataUploadMappingDto
	{
		public string FileName { get; set; } = string.Empty;
		public int DomainId { get; set; }
	}
}
