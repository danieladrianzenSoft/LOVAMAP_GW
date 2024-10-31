using System.Text.Json;

namespace Infrastructure.DTOs
{
	public class DescriptorDto
	{
		public int Id { get; set; }
		public int DescriptorTypeId { get; set; }
		public string Name { get; set; } = null!;
		public string Label { get; set; } = null!;
		public string? Unit { get; set; }
		public string? Values { get; set; } 
		
	}
}