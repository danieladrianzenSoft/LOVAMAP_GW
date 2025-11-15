namespace Infrastructure.DTOs
{
	public class InputGroupForMatchRequest
	{
		public string? ContainerShape { get; set; }
		public double? ContainerSize { get; set; }
		public string? PackingConfiguration { get; set; }
		public List<ParticlePropertyGroupToCreateDto> Particles { get; set; } = [];
		public string? SizeDistribution { get; set; }
		public bool IsSimulated { get; set; } = false;
	}

	public class ScaffoldGroupMatch
	{
		public int ScaffoldGroupId { get; set; }
		public string Name { get; set; } = null!;
		public double MatchScore { get; set; } // 0-100
		public Dictionary<string, string> Differences { get; set; } = new Dictionary<string, string>(); // What's different
		public ScaffoldGroupSummaryDto Details { get; set; } = null!;
	}
}
