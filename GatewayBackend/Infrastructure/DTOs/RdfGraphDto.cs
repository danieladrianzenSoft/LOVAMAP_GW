namespace Infrastructure.DTOs
{
	public sealed class RdfGraphDto
	{
		public List<RdfGraphNodeDto> Nodes { get; set; } = new();
		public List<RdfGraphEdgeDto> Edges { get; set; } = new();
	}

	public sealed class RdfGraphNodeDto
	{
		public string Id { get; set; } = string.Empty;
		public string Label { get; set; } = string.Empty;
		public string Type { get; set; } = string.Empty;
		public string? Group { get; set; }
		public Dictionary<string, object?> Properties { get; set; } = new();
	}

	public sealed class RdfGraphEdgeDto
	{
		public string Source { get; set; } = string.Empty;
		public string Target { get; set; } = string.Empty;
		public string Label { get; set; } = string.Empty;
	}

	public sealed class RdfOntologySummaryDto
	{
		public List<RdfClassSummaryDto> Classes { get; set; } = new();
		public List<RdfPropertySummaryDto> Properties { get; set; } = new();
		public int TotalTriples { get; set; }
		public int TotalInstances { get; set; }
	}

	public sealed class RdfClassSummaryDto
	{
		public string Uri { get; set; } = string.Empty;
		public string Label { get; set; } = string.Empty;
		public int InstanceCount { get; set; }
	}

	public sealed class RdfPropertySummaryDto
	{
		public string Uri { get; set; } = string.Empty;
		public string Label { get; set; } = string.Empty;
		public int UsageCount { get; set; }
		public string? Datatype { get; set; }
		public List<string> DistinctValues { get; set; } = new();
	}
}
