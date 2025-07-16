namespace Infrastructure.DTOs
{
	public class DescriptorToSeedDto
	{
		public required string DescriptorName { get; set; }
		public List<int> ScaffoldIds { get; set; } = [];
	}
}