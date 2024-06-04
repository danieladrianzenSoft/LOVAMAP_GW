namespace Infrastructure.DTOs
{
	public class ScaffoldBaseDto
	{
		public int Id { get; set; }
		public int ReplicateNumber { get; set; }
		public List<DescriptorDto> GlobalDescriptors { get; set; } = [];
		public List<DescriptorDto> PoreDescriptors { get; set; } = [];
		public List<DescriptorDto> OtherDescriptors { get; set; } = [];
		
	}
}

