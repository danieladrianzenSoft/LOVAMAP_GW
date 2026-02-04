namespace Infrastructure.DTOs
{
	public sealed class RdfScaffoldAllDto
	{
		public string ScaffoldUri { get; set; } = string.Empty;
		public string? ParticleShape { get; set; }
		public int? ParticleSizeUm { get; set; }
		public decimal? VoidVolumeFraction { get; set; }
		public decimal? BioMeasurementX { get; set; }
		public decimal? BioMeasurementY { get; set; }
	}
}
