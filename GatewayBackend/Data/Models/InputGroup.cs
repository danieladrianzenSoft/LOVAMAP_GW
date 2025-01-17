
using System.Text.Json;

namespace Data.Models
{
	public class InputGroup
	{
		public int Id { get; set; }
		public int ScaffoldGroupId { get; set; }
		public ScaffoldGroup ScaffoldGroup { get; set; } = null!;
		public string? ContainerShape { get; set; }
		public int? ContainerSize { get; set; }
		public PackingConfiguration PackingConfiguration { get; set; } = 0;
		public JsonDocument? SizeDistribution { get; set; } 
		public ICollection<ParticlePropertyGroup> ParticlePropertyGroups { get; set; } = new List<ParticlePropertyGroup>();
	}

	public enum PackingConfiguration
	{
		Unknown = -1,
		Isotropic = 0,
		Anisotropic = 1,
		Square = 2,
		Hexagonal = 3
	}

}
