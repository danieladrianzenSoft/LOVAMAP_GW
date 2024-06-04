
namespace Infrastructure.DTOs
{
	public class ScaffoldToCreateDto
	{
		public int ReplicateNumber { get; set; }
		public virtual ICollection<GlobalDescriptorToCreateDto> GlobalDescriptors { get; set; }
		public virtual ICollection<PoreDescriptorToCreateDto> PoreDescriptors { get; set; }
		public virtual ICollection<OtherDescriptorToCreateDto> OtherDescriptors { get; set; }

	}
}
