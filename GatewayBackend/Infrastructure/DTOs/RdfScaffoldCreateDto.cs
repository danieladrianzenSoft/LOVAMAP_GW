namespace Infrastructure.DTOs
{
	public sealed class RdfScaffoldCreateDto
	{
		public int ScaffoldId { get; set; }
		public string ParticleShape { get; set; } = string.Empty;
		public int ParticleSizeUm { get; set; }
		public decimal VoidVolumeFraction { get; set; }
		public decimal BioMeasurementX { get; set; }
		public decimal? BioMeasurementY { get; set; }
	}
}
