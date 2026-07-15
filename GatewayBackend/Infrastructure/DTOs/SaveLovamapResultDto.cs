namespace Infrastructure.DTOs
{
	public class SaveLovamapResultDto
	{
		public int? ScaffoldGroupId { get; set; }
		public bool IsSimulated { get; set; } = true;
		public string PackingConfiguration { get; set; } = "Isotropic";
		public string ContainerShape { get; set; } = "cube";
		public string? ContainerDimensions { get; set; }
		public List<SaveLovamapResultParticleDto> Particles { get; set; } = new();
		public string? InterlinkingMechanism { get; set; }
		public string? ScaffoldOccupants { get; set; }
		public string? ImagingMethod { get; set; }
	}

	public class SaveLovamapResultParticleDto
	{
		public string Shape { get; set; } = "spheres";
		public string Stiffness { get; set; } = "rigid";
		public string Dispersity { get; set; } = "polydisperse";
		public string? SizeDistributionType { get; set; }
		public string? Material { get; set; }
		public double Proportion { get; set; } = 1;
	}
}
