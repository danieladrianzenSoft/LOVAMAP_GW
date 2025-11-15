
using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class CoreJobDto
	{
		public int Id { get; set; }                  // core DB id (numeric)
		public string? JobId { get; set; }          // external GUID-like id (string), if core sets it
		public string? FileName { get; set; }
		public int Status { get; set; }             // or JobStatus if you share enum values
		public DateTime SubmittedAt { get; set; }
		public DateTime? StartedAt { get; set; }
		public DateTime? CompletedAt { get; set; }
		public string? ResultPath { get; set; }
		public int RetryCount { get; set; }
		public string? ErrorMessage { get; set; }
		// add any other fields Core returns that you care about
	}
}

