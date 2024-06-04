namespace Infrastructure.DTOs
{
	public class InputGroupBaseDto
	{
		public int? Dx { get; set; }
		public int? NumVoxels { get; set; }
		public string? ContainerShape { get; set; }
		public int? ContainerSize { get; set; }
		public bool? IsAnisotropic { get; set; }
		public ICollection<ParticlePropertyBaseDto> Particles { get; set; } = [];
	}
}