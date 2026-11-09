using Data.Models;

namespace Infrastructure.DTOs
{
	public class JobFilterParams : PagingParams
	{
		public JobStatus? Status { get; set; }
		public JobType? JobType { get; set; }
		public string? Search { get; set; }
	}
}
