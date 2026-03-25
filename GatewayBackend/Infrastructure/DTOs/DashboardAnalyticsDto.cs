namespace Infrastructure.DTOs
{
	public sealed class DashboardAnalyticsDto
	{
		public int TotalScaffolds { get; set; }
		public int TotalScaffoldGroups { get; set; }
		public int SimulatedGroupCount { get; set; }
		public int RealGroupCount { get; set; }
		public int SimulatedScaffoldCount { get; set; }
		public int RealScaffoldCount { get; set; }
		public int PublicCount { get; set; }
		public int PrivateCount { get; set; }
		public Dictionary<string, List<CategoryCountDto>> TagDistributions { get; set; } = new();
		public List<CategoryCountDto> PackingConfigurationDistribution { get; set; } = new();
		public List<CategoryCountDto> ContainerShapeDistribution { get; set; } = new();
		public List<SizeBinDto> ParticleSizeBins { get; set; } = new();
		public List<TimeSeriesPointDto> UploadsOverTime { get; set; } = new();
		public List<TimeSeriesPointDto> DownloadsOverTime { get; set; } = new();
	}

	public sealed class CategoryCountDto
	{
		public string Name { get; set; } = string.Empty;
		public int Count { get; set; }
		public int SimulatedCount { get; set; }
		public int RealCount { get; set; }
	}

	public sealed class SizeBinDto
	{
		public string Label { get; set; } = string.Empty;
		public double MinSize { get; set; }
		public double MaxSize { get; set; }
		public int Count { get; set; }
		public int SimulatedCount { get; set; }
		public int RealCount { get; set; }
	}

	public sealed class TimeSeriesPointDto
	{
		public string Period { get; set; } = string.Empty;
		public int Count { get; set; }
	}
}
