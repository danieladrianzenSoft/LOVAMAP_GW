namespace Infrastructure.DTOs
{
	public class SaveLovamapResultDto
	{
		public int? ScaffoldGroupId { get; set; }
		public string Shape { get; set; } = "spheres";
		public string Stiffness { get; set; } = "rigid";
		public string Dispersity { get; set; } = "polydisperse";
		public string PackingConfiguration { get; set; } = "Isotropic";
		public string ContainerShape { get; set; } = "cube";
		public string? ContainerDimensions { get; set; }
	}
}
