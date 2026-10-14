namespace KnowledgeBaseApi.DTOs
{
	public sealed class PaperDto
	{
		public string Uri { get; set; } = "";
		public string Title { get; set; } = "";
		public string Doi { get; set; } = "";
		public string? Year { get; set; }
		public string? JournalUri { get; set; }
		public string? JournalTitle { get; set; }
		public string? PaperType { get; set; }
		public string? FocusMaterial { get; set; }
		public bool? HasLabData { get; set; }
		public string? Citation { get; set; }
		public List<string> AuthorUris { get; set; } = new();
		public List<string> AuthorNames { get; set; } = new();
	}

	public sealed class AuthorDto
	{
		public string Uri { get; set; } = "";
		public string? FamilyName { get; set; }
		public string? GivenName { get; set; }
		public string? Name { get; set; }
		public string? Affiliation { get; set; }
	}

	public sealed class JournalDto
	{
		public string Uri { get; set; } = "";
		public string Title { get; set; } = "";
		public string? Issn { get; set; }
	}

	public sealed class MaterialDto
	{
		public string Uri { get; set; } = "";
		public string Label { get; set; } = "";
		public string? PaperUri { get; set; }
		public string? ParticleShape { get; set; }
		public string? ParticleMaterial { get; set; }
		public double? ParticleSizeMin { get; set; }
		public double? ParticleSizeMax { get; set; }
		public string? ParticleSizeUnit { get; set; }
		public string? SizeDistribution { get; set; }
		public string? StiffnessQualitative { get; set; }
		public double? StiffnessValue { get; set; }
		public string? StiffnessUnit { get; set; }
		public string? SurfaceModification { get; set; }
		public string? FabricationMethodUri { get; set; }
		public string? GeometryProfileUri { get; set; }
		public string? PackingConfiguration { get; set; }
		public string? ReportedPoreSize { get; set; }
	}

	public sealed class ExperimentDto
	{
		public string Uri { get; set; } = "";
		public string Label { get; set; } = "";
		public string? PaperUri { get; set; }
		public string? ExperimentCategory { get; set; }
		public string? ExperimentType { get; set; }
		public string? AssayOrMethod { get; set; }
		public string? CellType { get; set; }
		public string? CellSource { get; set; }
		public string? CultureDuration { get; set; }
		public string? Equipment { get; set; }
		public string? Temperature { get; set; }
		public string? SeedingDensity { get; set; }
		public string? CultureMedium { get; set; }
		public int? SampleSize { get; set; }
		public List<string> UsedMaterialUris { get; set; } = new();
	}

	public sealed class OutcomeDto
	{
		public string Uri { get; set; } = "";
		public string Label { get; set; } = "";
		public string? PaperUri { get; set; }
		public string? ExperimentUri { get; set; }
		public string? MeasurementCategory { get; set; }
		public string? MeasurementType { get; set; }
		public double? Value { get; set; }
		public string? Unit { get; set; }
		public string? ValueString { get; set; }
		public string? Scope { get; set; }
		public bool? Significant { get; set; }
		public string? Direction { get; set; }
		public string? ComparedTo { get; set; }
		public string? ComparisonGroup { get; set; }
		public string? TimePoint { get; set; }
		public double? StdDev { get; set; }
		public string? DataSource { get; set; }
	}

	public sealed class FabricationMethodDto
	{
		public string Uri { get; set; } = "";
		public string Label { get; set; } = "";
		public string? PaperUri { get; set; }
		public string? Chemistry { get; set; }
		public string? ManufacturingMethod { get; set; }
		public string? AnnealingChemistry { get; set; }
		public string? AnnealingConditions { get; set; }
		public List<string> ReagentUris { get; set; } = new();
	}

	public sealed class GeometryProfileDto
	{
		public string Uri { get; set; } = "";
		public string Label { get; set; } = "";
		public string? MatchType { get; set; }
		public string? MatchDescription { get; set; }
		public string? MatchMaterial { get; set; }
		public double? MatchSizeMin { get; set; }
		public double? MatchSizeMax { get; set; }
		public int? ScaffoldCount { get; set; }
	}

	public sealed class ReagentDto
	{
		public string Uri { get; set; } = "";
		public string? Label { get; set; }
		public string? Role { get; set; }
		public string? Function { get; set; }
		public string? Concentration { get; set; }
		public string? Supplier { get; set; }
		public string? MolecularWeight { get; set; }
		public string? Sequence { get; set; }
	}

	public sealed class ComparisonResultDto
	{
		public string Uri { get; set; } = "";
		public string? Label { get; set; }
		public string? PaperUri { get; set; }
		public string? OutcomeAUri { get; set; }
		public string? OutcomeBUri { get; set; }
		public string? Direction { get; set; }
		public bool? IsSignificant { get; set; }
		public double? PValue { get; set; }
		public double? FoldChange { get; set; }
	}
}
