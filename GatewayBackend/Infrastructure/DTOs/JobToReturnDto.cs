
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class JobToReturnDto
	{
		public string? Id { get; set; }                  // core DB id (numeric)
		public string? FileName { get; set; }
		public string? Status { get; set; }             // or JobStatus if you share enum values
		public DateTime SubmittedAt { get; set; }
		public DateTime? StartedAt { get; set; }
		public DateTime? CompletedAt { get; set; }
		public bool HasResults { get; set; }
		public string? ErrorMessage { get; set; }
		public string? JobType { get; set; }
		public string? SourceJobId { get; set; }
		public int? ScaffoldGroupId { get; set; }
		public int? ScaffoldId { get; set; }
	}
}

