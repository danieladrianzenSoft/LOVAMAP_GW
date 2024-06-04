
namespace Data.Models
{
	public class InputGroup
	{
		public int Id { get; set; }
		public int ScaffoldGroupId { get; set; }
		public ScaffoldGroup ScaffoldGroup { get; set; } = null!;	
		public int? Dx { get; set; }
		public int? NumVoxels { get; set; }
		public string? ContainerShape { get; set; }
		public int? ContainerSize { get; set; }
		public bool IsAnisotropic { get; set; } = false;
		public ICollection<ParticlePropertyGroup> ParticlePropertyGroups { get; set; } = new List<ParticlePropertyGroup>();

	}
}
