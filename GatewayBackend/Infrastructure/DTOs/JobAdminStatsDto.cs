namespace Infrastructure.DTOs
{
	public sealed class JobAdminStatsDto
	{
		public int TotalJobs { get; set; }
		public int CompletedCount { get; set; }
		public int FailedCount { get; set; }
		public int PendingCount { get; set; }
		public int RunningCount { get; set; }
		public int StoppedCount { get; set; }
		public List<JobTypeCountDto> JobTypeCounts { get; set; } = new();
		public List<JobMonthlyCountDto> MonthlyCounts { get; set; } = new();
	}

	public sealed class JobTypeCountDto
	{
		public string JobType { get; set; } = string.Empty;
		public int Count { get; set; }
	}

	public sealed class JobMonthlyCountDto
	{
		public string Period { get; set; } = string.Empty;
		public int Total { get; set; }
		public int Completed { get; set; }
		public int Failed { get; set; }
		public int Other { get; set; }
	}

	public sealed class UserFailureRankingDto
	{
		public string UserId { get; set; } = string.Empty;
		public string? Email { get; set; }
		public string? UserName { get; set; }
		public int FailureCount { get; set; }
		public DateTime LastFailureAt { get; set; }
	}
}
