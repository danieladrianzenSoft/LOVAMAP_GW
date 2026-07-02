using System.ComponentModel.DataAnnotations;

namespace Infrastructure.DTOs
{
	public class BatchReplaceRequestDto
	{
		[Required]
		public required string SourcePath { get; set; }
		public bool DryRun { get; set; } = true;
	}

	public class BatchReplaceResultDto
	{
		public bool DryRun { get; set; }
		public int TotalFilesScanned { get; set; }
		public int MatchedCount => Matched.Count;
		public int UnmatchedCount => UnmatchedFiles.Count;
		public int SucceededCount => Matched.Count(m => m.Replaced);
		public int FailedCount => Errors.Count;
		public List<BatchReplaceFileMatchDto> Matched { get; set; } = new();
		public List<string> UnmatchedFiles { get; set; } = new();
		public List<string> Errors { get; set; } = new();
	}

	public class BatchReplaceFileMatchDto
	{
		public string FileName { get; set; } = string.Empty;
		public int DomainId { get; set; }
		public int ScaffoldId { get; set; }
		public string Category { get; set; } = string.Empty;
		public string MatchedOriginalFileName { get; set; } = string.Empty;
		public bool HasMetadataFile { get; set; }
		public bool Replaced { get; set; }
	}
}
