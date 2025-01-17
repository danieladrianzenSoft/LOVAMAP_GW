
using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class InputGroupToCreateDto
	{
		public int Dx { get; set; }
		public int NumVoxels { get; set; }
		public string ContainerShape { get; set; } = "Cube";
		public int ContainerSize { get; set; }
		public string PackingConfiguration { get; set; } = "Isotropic";
		public JsonDocument SizeDistribution { get; set; } = JsonDocument.Parse("{}");
		public ICollection<ParticlePropertyGroupToCreateDto> ParticlePropertyGroups { get; set; } = [];

	}
}
