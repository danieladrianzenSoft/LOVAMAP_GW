
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class InputGroupToCreateDto
	{
		// public int Dx { get; set; }
		// public int NumVoxels { get; set; }
		public string ContainerShape { get; set; } = "Cube";
		public int? ContainerSize { get; set; }
		public string? ContainerDimensions { get; set; }
		public string PackingConfiguration { get; set; } = "Isotropic";
		public JsonDocument SizeDistribution { get; set; } = JsonDocument.Parse("{}");
		public string? InterlinkingMechanism { get; set; }
		public string? ScaffoldOccupants { get; set; }
		public string? ImagingMethod { get; set; }
		public ICollection<ParticlePropertyGroupToCreateDto> ParticlePropertyGroups { get; set; } = [];

	}
}
